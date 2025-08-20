-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `parentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skuId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('SOLD_OUT', 'IN_STOCK', 'PRE_SALE') NOT NULL DEFAULT 'IN_STOCK',
    `basePrice` DECIMAL(65, 30) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `products_skuId_key`(`skuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `productId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `price` DECIMAL(65, 30) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `productId` INTEGER NOT NULL,
    `sizeId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sizes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameSize` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sizes_nameSize_key`(`nameSize`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `categoryId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,

    UNIQUE INDEX `category_products_categoryId_productId_key`(`categoryId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `carts_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `cartId` INTEGER NOT NULL,
    `productVariantId` INTEGER NOT NULL,

    UNIQUE INDEX `cart_items_cartId_productVariantId_key`(`cartId`, `productVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(65, 30) NOT NULL,
    `deliveryAddress` VARCHAR(255) NOT NULL,
    `paymentMethod` ENUM('CASH', 'CREDIT_CARD', 'E_WALLET', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    `paymentStatus` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
=======
=======
<<<<<<< HEAD
    `paymentStatus` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
=======
=======
>>>>>>> 0bfb2ab (feat: view-order/get-list-order/get-list-user)
>>>>>>> 6441ff4 (feat: view-order/get-list-order/get-list-user)
=======
<<<<<<< HEAD
    `paymentStatus` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
=======
=======
>>>>>>> 0bfb2ab (feat: view-order/get-list-order/get-list-user)
=======
>>>>>>> 5b661be (feat: implement api docs)
>>>>>>> c25f5ac (feat: implement api docs)
<<<<<<<< HEAD:apps/product-service/prisma/migrations/20250909023540_update_client_generated/migration.sql
    `paymentStatus` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
========
    `paymentStatus` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED', 'FAILED') NOT NULL DEFAULT 'UNPAID',
>>>>>>>> a987e86 (# This is a combination of 7 commits.):apps/product-service/prisma/migrations/20250908084512_update_db_product_service/migration.sql
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 4808628 (feat: implement feature confirm-reject-order)
=======
=======
>>>>>>> c25f5ac (feat: implement api docs)
<<<<<<< HEAD
>>>>>>> 4808628 (feat: implement feature confirm-reject-order)
=======
>>>>>>> 0bfb2ab (feat: view-order/get-list-order/get-list-user)
<<<<<<< HEAD
>>>>>>> 6441ff4 (feat: view-order/get-list-order/get-list-user)
=======
=======
>>>>>>> 5b661be (feat: implement api docs)
>>>>>>> c25f5ac (feat: implement api docs)
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    `status` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
=======
=======
<<<<<<< HEAD
    `status` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
=======
=======
>>>>>>> 0bfb2ab (feat: view-order/get-list-order/get-list-user)
>>>>>>> 6441ff4 (feat: view-order/get-list-order/get-list-user)
=======
<<<<<<< HEAD
    `status` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
=======
=======
>>>>>>> 0bfb2ab (feat: view-order/get-list-order/get-list-user)
=======
>>>>>>> 5b661be (feat: implement api docs)
>>>>>>> c25f5ac (feat: implement api docs)
<<<<<<<< HEAD:apps/product-service/prisma/migrations/20250909023540_update_client_generated/migration.sql
    `status` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
========
    `status` ENUM('PENDING', 'UNPAID', 'PAID', 'CANCELLED', 'REFUNDED', 'FAILED') NOT NULL DEFAULT 'UNPAID',
>>>>>>>> a987e86 (# This is a combination of 7 commits.):apps/product-service/prisma/migrations/20250908084512_update_db_product_service/migration.sql
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 4808628 (feat: implement feature confirm-reject-order)
=======
=======
>>>>>>> c25f5ac (feat: implement api docs)
<<<<<<< HEAD
>>>>>>> 4808628 (feat: implement feature confirm-reject-order)
=======
>>>>>>> 0bfb2ab (feat: view-order/get-list-order/get-list-user)
<<<<<<< HEAD
>>>>>>> 6441ff4 (feat: view-order/get-list-order/get-list-user)
=======
=======
>>>>>>> 5b661be (feat: implement api docs)
>>>>>>> c25f5ac (feat: implement api docs)
    `amount` DECIMAL(65, 30) NOT NULL,
    `transactionCode` VARCHAR(100) NOT NULL,
    `accountNumber` VARCHAR(100) NOT NULL,
    `bankCode` VARCHAR(50) NOT NULL,
    `paymentType` ENUM('PAYIN', 'PAYOUT') NOT NULL DEFAULT 'PAYIN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `orderId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `note` VARCHAR(255) NULL,
    `orderId` INTEGER NOT NULL,
    `productVariantId` INTEGER NOT NULL,

    UNIQUE INDEX `order_items_orderId_productVariantId_key`(`orderId`, `productVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rating` DECIMAL(65, 30) NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,

    UNIQUE INDEX `reviews_userId_productId_key`(`userId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suggestions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `imageUrl` VARCHAR(255) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `suggestions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_sizeId_fkey` FOREIGN KEY (`sizeId`) REFERENCES `sizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_products` ADD CONSTRAINT `category_products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_products` ADD CONSTRAINT `category_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `carts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_productVariantId_fkey` FOREIGN KEY (`productVariantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productVariantId_fkey` FOREIGN KEY (`productVariantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
