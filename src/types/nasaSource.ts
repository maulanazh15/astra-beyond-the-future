/** How far a source entry has been checked by the ASTRA team. */
export type SourceVerification =
  /** Quoted values were checked against the publication (abstract or full text). */
  | 'verified'
  /** The link and scope were checked, but no numeric values are taken from it yet. */
  | 'link-only'

export type SourceType = 'dataset' | 'publication' | 'program-page'

/** Citation metadata for one NASA (or NASA-funded) reference. */
export type NasaSource = {
  id: string
  organization: string
  missionOrInstrument: string
  title: string
  /** Full bibliographic citation for publications. */
  citation?: string
  url: string
  sourceType: SourceType
  /** ISO date (YYYY-MM-DD) the link was last checked. */
  accessedOn: string
  verification: SourceVerification
  /** What ASTRA takes from this source, in plain words. */
  extracted: string
  /** Game variables this source informs. */
  gameVariables: string[]
}

/**
 * Where a dataset value comes from.
 * - source-derived: taken directly from a cited, verified source.
 * - derived-estimate: computed from source values with a documented simplification.
 * - placeholder: representative value not yet extracted from the source data.
 */
export type DataProvenance = 'source-derived' | 'derived-estimate' | 'placeholder'

/** A dataset value with units, provenance, and processing notes. */
export type SourcedValue<T = number> = {
  value: T
  unit: string
  provenance: DataProvenance
  /** Sources that support or inform the value. */
  sourceIds: string[]
  processing: string
}
