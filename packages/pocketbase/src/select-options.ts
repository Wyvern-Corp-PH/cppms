type CollectionField = {
  name?: unknown
  values?: unknown
  options?: {
    values?: unknown
  }
}

type CollectionSchema = {
  fields?: unknown
}

type CollectionSchemaClient = {
  collections?: {
    getOne?: (idOrName: string) => Promise<CollectionSchema>
  }
}

type OptionRecord = {
  name?: unknown
  active?: unknown
  sort_order?: unknown
}

type OptionRecordClient = {
  collection?: (name: string) => {
    getFullList: () => Promise<unknown[]>
  }
}

function stringValues(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
}

function collectionFields(schema: CollectionSchema) {
  return Array.isArray(schema.fields) ? (schema.fields as CollectionField[]) : []
}

function uniqueValues(values: readonly string[]) {
  return Array.from(new Set(values))
}

export async function loadSelectFieldOptions(
  client: CollectionSchemaClient,
  collectionName: string,
  fieldName: string,
  fallback: readonly string[]
) {
  try {
    const schema = await client.collections?.getOne?.(collectionName)
    const field = collectionFields(schema ?? {}).find((candidate) => candidate.name === fieldName)
    const values = uniqueValues([
      ...stringValues(field?.values),
      ...stringValues(field?.options?.values),
    ])

    return values.length > 0 ? values : [...fallback]
  } catch {
    return [...fallback]
  }
}

export async function loadOptionRecordNames(
  client: OptionRecordClient,
  collectionName: string,
  fallback: readonly string[]
) {
  try {
    const rows = await client.collection?.(collectionName).getFullList()
    const names = (rows ?? [])
      .filter((row): row is OptionRecord => Boolean(row) && typeof row === "object")
      .filter((row) => row.active === true)
      .sort((a, b) => {
        const left = typeof a.sort_order === "number" ? a.sort_order : 0
        const right = typeof b.sort_order === "number" ? b.sort_order : 0
        return left - right
      })
      .map((row) => row.name)
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0)

    return names.length > 0 ? uniqueValues(names) : [...fallback]
  } catch {
    return [...fallback]
  }
}
