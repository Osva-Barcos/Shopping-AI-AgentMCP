-- Seed data para testing
-- Ejecutar después de crear el schema

-- Productos de ejemplo
INSERT INTO products (id, name, description, price, stock) VALUES
('prod_1', 'Notebook Lenovo IdeaPad 3', 'Intel Core i5, 8GB RAM, 256GB SSD', 85000, 15),
('prod_2', 'Mouse Logitech M185', 'Mouse inalámbrico con nano receptor USB', 2500, 50),
('prod_3', 'Teclado Redragon Kumara', 'Teclado mecánico RGB 87 teclas', 12000, 30),
('prod_4', 'Monitor Samsung 24"', 'Full HD 1920x1080, 75Hz', 45000, 10),
('prod_5', 'Webcam Logitech C920', 'Full HD 1080p con micrófono', 15000, 25),
('prod_6', 'Auriculares HyperX Cloud', 'Gaming con micrófono desmontable', 18000, 20),
('prod_7', 'Pad Mouse XL', 'Extended 80x30cm con base antideslizante', 3500, 100),
('prod_8', 'Hub USB 3.0', '4 puertos USB de alta velocidad', 5000, 40);
