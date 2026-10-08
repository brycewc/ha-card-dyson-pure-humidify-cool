export function toDisplayEntry(entry) {
  return {
    entity_id: entry.entity_id,
    device_id: entry.device_id,
    translation_key: entry.translation_key ?? undefined,
    platform: entry.platform,
    entity_category: entry.entity_category ?? undefined,
    name: entry.name ?? undefined,
  };
}
