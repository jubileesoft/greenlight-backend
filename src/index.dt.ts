export interface JFilterOr {
  or?: {
    property: string;
    values: unknown[];
  };
}

export type JFilter = { [k: string]: any } & JFilterOr;
