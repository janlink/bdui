export interface Options {
  readonly ambiguousIsNarrow?: boolean;
  readonly countAnsiEscapeCodes?: boolean;
}

export default function stringWidth(input: string, options?: Options): number;
