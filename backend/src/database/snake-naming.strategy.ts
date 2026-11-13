import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/** internalCode -> internal_code | engineTempC -> engine_temp_c */
function toSnakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Propiedades camelCase en el código -> columnas snake_case en la base de datos,
 * tal como figura en el ERD del informe (sección 4.1).
 */
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    if (customName) return customName;
    return toSnakeCase([...embeddedPrefixes, propertyName].join('_'));
  }

  relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }

  // Columna de clave foránea: vehicleType + id -> vehicle_type_id
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }
}
