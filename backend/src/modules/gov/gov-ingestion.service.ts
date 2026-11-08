import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Placeholder for Phase 2 automated ingestion (GeM / CPPP official feeds only).
 * No scraping — wire official APIs or client-provided exports when available.
 */
export interface GovIngestionService {
  readonly enabled: boolean;
  /** Future: pull from configured official sources and return normalized import rows. */
  pullOfficialFeeds?(): Promise<unknown[]>;
}

export const GOV_GEM_ENABLED = 'GOV_GEM_ENABLED';

@Injectable()
export class GovIngestionStub implements GovIngestionService {
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    const raw =
      config.get<string>(GOV_GEM_ENABLED) ?? process.env.GOV_GEM_ENABLED;
    this.enabled = raw === 'true' || raw === '1';
  }
}
