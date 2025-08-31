<?php
// Simple CLI seeder for the project.
// Usage: php scripts/seed_products.php

require_once __DIR__ . '/../config.php';

$categories = [
    'Headphones' => ['images' => ['13-330x361.jpg','12-330x361.jpg','2-936x1024.jpg']],
    'Speakers'   => ['images' => ['20-330x361.jpg','21-330x361.jpg','36-330x361.jpg']],
    'Accessories'=> ['images' => ['49-330x361.jpg','50-330x361.jpg','55-330x361.jpg']],
];

$inserted = 0;
$pdo->beginTransaction();
try {
    foreach ($categories as $name => $meta) {
        $stmt = $pdo->prepare('SELECT id FROM categories WHERE name = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$name]);
        $found = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($found) {
            $catId = (int)$found['id'];
        } else {
            $stmt = $pdo->prepare('INSERT INTO categories (name) VALUES (?)');
            $stmt->execute([$name]);
            $catId = (int)$pdo->lastInsertId();
        }

        $i = 1;
        foreach ($meta['images'] as $img) {
            $title = "$name Sample Product $i";
            $exists = $pdo->prepare('SELECT id FROM products WHERE name = ?');
            $exists->execute([$title]);
            if ($exists->fetch()) { $i++; continue; }
            $desc = "Demo product $i for $name category.";
            $price = rand(20, 199) + (rand(0,99)/100);
            $stmt = $pdo->prepare('INSERT INTO products (category_id, name, description, image, price, featured) VALUES (?, ?, ?, ?, ?, ?)');
            $featured = ($i === 1) ? 1 : 0;
            $stmt->execute([$catId, $title, $desc, $img, $price, $featured]);
            $inserted++;
            $i++;
        }
    }
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    echo "Seeding failed: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

$cats = $pdo->query('SELECT c.name AS category_name, COUNT(p.id) as cnt FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.id')->fetchAll(PDO::FETCH_ASSOC);
$total = (int)$pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();

echo "Inserted: $inserted products\n";
echo "Total products: $total\n";
foreach ($cats as $c) {
    echo sprintf("- %s: %s\n", $c['category_name'], $c['cnt']);
}

echo "Done. You can now run the PHP built-in server to preview the dynamic site:\n    php -S localhost:8000 -t public\n";
