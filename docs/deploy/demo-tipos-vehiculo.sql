-- Tipos de vehículo de la demo. La API no tiene endpoint para crearlos (solo para
-- vehículos, ver api-contracts.yaml), así que se cargan por SQL, una sola vez.
-- Repetible: no duplica un tipo que ya existe. Se insertan de a uno y en orden, porque
-- cargar-datos-demo.mjs espera que el tipo 1 sea el camión y el tipo 2 la pala
-- (en una base vacía; si la tabla ya tenía filas, los ids serán otros).
INSERT INTO vehicle_types (name, category)
SELECT 'Camión fuera de ruta', 'Transporte'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Camión fuera de ruta');

INSERT INTO vehicle_types (name, category)
SELECT 'Pala mecánica', 'Excavación'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Pala mecánica');
