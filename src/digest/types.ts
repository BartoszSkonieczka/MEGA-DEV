export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: 'ok' | 'retry' | 'fail';
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type NightDigest = {
  rows: DigestRow[];
  malformedLines: number;
};

export type ReadNight = (runsDir: string, night: string) => NightDigest;
