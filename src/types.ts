export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

export interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  translation_key?: string | null;
  platform?: string;
  name?: string | null;
  entity_category?: string | null;
}

export interface DeviceRegistryEntry {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
  model?: string | null;
}

export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities: Record<string, EntityRegistryEntry>;
  devices?: Record<string, DeviceRegistryEntry>;
  user?: { id: string; name?: string; is_admin?: boolean };
  themes?: { darkMode?: boolean };
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  callWS<T = unknown>(message: Record<string, unknown>): Promise<T>;
}

export interface CardConfig {
  type: string;
  entity: string;
  title?: string;
  show_maintenance?: boolean;
  entities?: Partial<Record<string, string>>;
}
