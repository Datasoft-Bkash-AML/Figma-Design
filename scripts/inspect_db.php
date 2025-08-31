<?php
require __DIR__ . '/../config.php';
// Print basic schema info and a few sample rows to guide frontend rendering
$tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
echo "Tables: \n" . implode(', ', $tables) . "\n\n";
foreach ($tables as $t) {
    $cnt = $pdo->query("SELECT COUNT(*) as c FROM \"$t\" LIMIT 1")->fetch(PDO::FETCH_ASSOC)['c'] ?? 0;
    echo "Table $t: $cnt rows\n";
}

// Show last 6 products
try {
    $rows = $pdo->query('SELECT id, name, description, image, category_id, featured, price FROM products ORDER BY rowid DESC LIMIT 6')->fetchAll(PDO::FETCH_ASSOC);
    echo "\nRecent products:\n";
    foreach ($rows as $r) {
        echo sprintf("%d | %s | cat=%s | featured=%s | image=%s | price=%s\n", $r['id'], $r['name'], $r['category_id'], $r['featured'], $r['image'], $r['price']);
    }
} catch (Exception $e) {
    echo "Could not query products: " . $e->getMessage() . "\n";
}

// Show categories
try {
    $cats = $pdo->query('SELECT id, name FROM categories ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    echo "\nCategories:\n";
    foreach ($cats as $c) echo sprintf("%d | %s\n", $c['id'], $c['name']);
} catch (Exception $e) {
    echo "Could not query categories: " . $e->getMessage() . "\n";
}
