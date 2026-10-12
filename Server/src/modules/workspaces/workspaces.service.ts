import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../common/exceptions/hypertron.exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { WalletSessionService } from '../wallet-auth/wallet-session.service';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: WalletSessionService,
  ) {}

  async list(walletPubkey: string) {
    const rows = await this.prisma.business.findMany({
      where: { walletPubkey, setupComplete: true },
      orderBy: { lastAccessedAt: 'desc' },
    });
    return { workspaces: rows.map((row) => this.toView(row)) };
  }

  async create(walletPubkey: string, token: string | undefined, input: CreateWorkspaceDto) {
    const data = this.fields(input);
    const stub = await this.prisma.business.findFirst({
      where: { walletPubkey, setupComplete: false },
      orderBy: { createdAt: 'asc' },
    });

    const business = stub
      ? await this.prisma.business.update({
          where: { id: stub.id },
          data: {
            ...data,
            setupComplete: true,
            lastAccessedAt: new Date(),
          },
        })
      : await this.prisma.business.create({
          data: {
            ...data,
            walletPubkey,
            setupComplete: true,
            lastAccessedAt: new Date(),
            ...this.sessions.workspaceProvision(walletPubkey),
          },
        });

    await this.sessions.bindSession(token, business.id);
    return { workspace: this.toView(business) };
  }

  async activate(walletPubkey: string, token: string | undefined, workspaceId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: workspaceId, walletPubkey, setupComplete: true },
    });
    if (!business) {
      throw new ResourceNotFoundException('Workspace not found.');
    }
    const touched = await this.prisma.business.update({
      where: { id: business.id },
      data: { lastAccessedAt: new Date() },
    });
    await this.sessions.bindSession(token, touched.id);
    return { ok: true as const, workspace: this.toView(touched) };
  }

  private fields(input: CreateWorkspaceDto): {
    name: string;
    workspaceType: string;
    website: string | null;
    teamSize: string;
    logoDataUrl: string | null;
    logoName: string | null;
    companyContext: string | null;
    invitedMembers: Prisma.InputJsonValue;
    tier: string;
  } {
    const invites = (input.invitedMembers ?? [])
      .map((member) => ({
        email: member.email.trim(),
        nickname: member.nickname.trim(),
        role: member.role.trim(),
        permission: member.permission.trim(),
      }))
      .filter((member) => member.email || member.nickname)
      .slice(0, 25);

    return {
      name: input.name.trim(),
      workspaceType: input.workspaceType,
      website: this.website(input.website),
      teamSize: input.teamSize ?? '1-5',
      ...this.logo(input.logoDataUrl, input.logoName),
      companyContext: input.companyContext?.trim() || null,
      invitedMembers: invites as unknown as Prisma.InputJsonValue,
      tier: 'Starter',
    };
  }

  private website(value?: string): string | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return null;
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new InvalidRequestException(
        'invalid_website',
        'Website must be a valid http(s) URL.',
        'website',
      );
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new InvalidRequestException(
        'invalid_website',
        'Website must be a valid http(s) URL.',
        'website',
      );
    }
    return trimmed;
  }

  private logo(dataUrl?: string, name?: string) {
    const trimmed = dataUrl?.trim() ?? '';
    if (!trimmed) return { logoDataUrl: null, logoName: null };
    if (!trimmed.startsWith('data:image/') || trimmed.length > 600_000) {
      throw new InvalidRequestException(
        'invalid_logo',
        'Logo must be a JPG, PNG, or SVG under 2 MB.',
        'logoDataUrl',
      );
    }
    return {
      logoDataUrl: trimmed,
      logoName: name?.trim().slice(0, 200) || null,
    };
  }

  private toView(business: {
    id: string;
    name: string;
    workspaceType: string | null;
    website: string | null;
    teamSize: string | null;
    logoDataUrl: string | null;
    tier: string;
    lastAccessedAt: Date;
    createdAt: Date;
  }) {
    return {
      id: business.id,
      name: business.name,
      workspaceType: business.workspaceType,
      website: business.website,
      teamSize: business.teamSize,
      logoUrl: business.logoDataUrl,
      tier: business.tier || 'Starter',
      role: 'Owner' as const,
      members: 1,
      lastAccessedAt: business.lastAccessedAt.toISOString(),
      createdAt: business.createdAt.toISOString(),
    };
  }
}

