-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_productVariantId_fkey`;

-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_productId_fkey`;

-- DropIndex
DROP INDEX `order_items_orderId_key` ON `order_items`;

-- DropIndex
DROP INDEX `order_items_productVariantId_key` ON `order_items`;

-- DropIndex
DROP INDEX `orders_userId_key` ON `orders`;

-- DropIndex
DROP INDEX `reviews_productId_key` ON `reviews`;

-- DropIndex
DROP INDEX `reviews_userId_key` ON `reviews`;

-- AddForeignKey
ALTER TABLE `category_products` ADD CONSTRAINT `category_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `carts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
