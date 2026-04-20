ab/**
 * prisma/seed.ts — B Vaishali full database seed
 * Run with: npx ts-node prisma/seed.ts
 *           (or npm run seed)
 *
 * Seed order respects FK constraints:
 * Users → Categories → Tags → Campaigns → Products → Variants/Images/Tags
 * → Addresses → DiscountCodes → Orders → OrderItems → History/Invoice/Shipment
 * → CouponUsage → WishlistItems → FlashSales → Banners → Broadcasts
 */

import 'dotenv/config';
import { PrismaClient, UserRole, ProductStatus, ImageType, OrderStatus, PaymentStatus, ShipmentStatus, DiscountType, BannerPosition, BroadcastChannel, BroadcastStatus, TargetSegment } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────
const hash = (p: string) => argon2.hash(p);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const daysFromNow = (n: number) => new Date(Date.now() + n * 864e5);

async function main() {
  console.log('🌱 Starting seed…');

  // ── 1. USERS ───────────────────────────────────────────
  console.log('  → users');

  const adminHash = await hash('Admin@123');
  const userHash = await hash('User@1234');

  const admin = await prisma.user.upsert({
    where: { email: 'lingarajmahanta24@gmail.com' },
    update: {},
    create: {
      email: 'lingarajmahanta24@gmail.com',
      passwordHash: adminHash,
      firstName: 'Lingaraj',
      lastName: 'Mahanta',
      phone: '+919876543210',
      role: UserRole.admin,
      authProvider: 'email',
      isVerified: true,
      lastLoginAt: daysAgo(1),
    },
  });

  const bvAdmin = await prisma.user.upsert({
    where: { email: 'me@bvaishali.com' },
    update: {},
    create: {
      email: 'me@bvaishali.com',
      passwordHash: adminHash,
      firstName: 'Vaishali',
      lastName: 'B',
      phone: '+919876543211',
      role: UserRole.admin,
      authProvider: 'email',
      isVerified: true,
      lastLoginAt: daysAgo(0),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@bvaishali.com' },
    update: {},
    create: {
      email: 'manager@bvaishali.com',
      passwordHash: adminHash,
      firstName: 'Priya',
      lastName: 'Nair',
      phone: '+919876543212',
      role: UserRole.manager,
      authProvider: 'email',
      isVerified: true,
    },
  });

  const customers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ananya.sharma@gmail.com' },
      update: {},
      create: {
        email: 'ananya.sharma@gmail.com',
        passwordHash: userHash,
        firstName: 'Ananya',
        lastName: 'Sharma',
        phone: '+919811111001',
        role: UserRole.customer,
        authProvider: 'email',
        isVerified: true,
        lastLoginAt: daysAgo(3),
      },
    }),
    prisma.user.upsert({
      where: { email: 'meera.patel@gmail.com' },
      update: {},
      create: {
        email: 'meera.patel@gmail.com',
        passwordHash: userHash,
        firstName: 'Meera',
        lastName: 'Patel',
        phone: '+919811111002',
        role: UserRole.customer,
        authProvider: 'email',
        isVerified: true,
        lastLoginAt: daysAgo(7),
      },
    }),
    prisma.user.upsert({
      where: { email: 'kavitha.reddy@gmail.com' },
      update: {},
      create: {
        email: 'kavitha.reddy@gmail.com',
        passwordHash: userHash,
        firstName: 'Kavitha',
        lastName: 'Reddy',
        phone: '+919811111003',
        role: UserRole.customer,
        authProvider: 'email',
        isVerified: false,
        lastLoginAt: daysAgo(15),
      },
    }),
    prisma.user.upsert({
      where: { email: 'sunita.mishra@gmail.com' },
      update: {},
      create: {
        email: 'sunita.mishra@gmail.com',
        passwordHash: userHash,
        firstName: 'Sunita',
        lastName: 'Mishra',
        phone: '+919811111004',
        role: UserRole.customer,
        authProvider: 'google',
        isVerified: true,
        lastLoginAt: daysAgo(2),
      },
    }),
    prisma.user.upsert({
      where: { email: 'deepa.iyer@gmail.com' },
      update: {},
      create: {
        email: 'deepa.iyer@gmail.com',
        passwordHash: userHash,
        firstName: 'Deepa',
        lastName: 'Iyer',
        phone: '+919811111005',
        role: UserRole.customer,
        authProvider: 'email',
        isVerified: true,
        lastLoginAt: daysAgo(5),
      },
    }),
  ]);

  // ── 2. CATEGORIES ──────────────────────────────────────
  console.log('  → categories');

  const cats = await Promise.all([
    prisma.category.upsert({ where: { slug: 'sarees' }, update: {}, create: { name: 'Sarees', slug: 'sarees', description: 'Handwoven and hand-printed sarees', sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: 'kurtas' }, update: {}, create: { name: 'Kurtas & Tops', slug: 'kurtas', description: 'Everyday and festive kurtas', sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: 'dresses' }, update: {}, create: { name: 'Dresses', slug: 'dresses', description: 'Maxi, midi and shift dresses', sortOrder: 3 } }),
    prisma.category.upsert({ where: { slug: 'co-ords' }, update: {}, create: { name: 'Co-ord Sets', slug: 'co-ords', description: 'Matching sets for every occasion', sortOrder: 4 } }),
    prisma.category.upsert({ where: { slug: 'dupattas' }, update: {}, create: { name: 'Dupattas & Stoles', slug: 'dupattas', description: 'Hand-block printed accessories', sortOrder: 5 } }),
  ]);
  const [catSarees, catKurtas, catDresses, catCoords, catDupattas] = cats;

  // ── 3. TAGS ────────────────────────────────────────────
  console.log('  → tags');

  const tags = await Promise.all([
    prisma.tag.upsert({ where: { slug: 'ikat' }, update: {}, create: { name: 'Ikat', slug: 'ikat' } }),
    prisma.tag.upsert({ where: { slug: 'block-print' }, update: {}, create: { name: 'Block Print', slug: 'block-print' } }),
    prisma.tag.upsert({ where: { slug: 'kantha' }, update: {}, create: { name: 'Kantha', slug: 'kantha' } }),
    prisma.tag.upsert({ where: { slug: 'natural-dye' }, update: {}, create: { name: 'Natural Dye', slug: 'natural-dye' } }),
    prisma.tag.upsert({ where: { slug: 'handwoven' }, update: {}, create: { name: 'Handwoven', slug: 'handwoven' } }),
    prisma.tag.upsert({ where: { slug: 'new-arrival' }, update: {}, create: { name: 'New Arrival', slug: 'new-arrival' } }),
    prisma.tag.upsert({ where: { slug: 'bestseller' }, update: {}, create: { name: 'Bestseller', slug: 'bestseller' } }),
    prisma.tag.upsert({ where: { slug: 'festive' }, update: {}, create: { name: 'Festive', slug: 'festive' } }),
    prisma.tag.upsert({ where: { slug: 'everyday' }, update: {}, create: { name: 'Everyday', slug: 'everyday' } }),
    prisma.tag.upsert({ where: { slug: 'limited-edition' }, update: {}, create: { name: 'Limited Edition', slug: 'limited-edition' } }),
  ]);
  const [tagIkat, tagBlock, tagKantha, tagNatDye, tagHandwoven, tagNew, tagBest, tagFestive, tagEveryday, tagLimited] = tags;

  // ── 4. CAMPAIGNS ───────────────────────────────────────
  console.log('  → campaigns');

  const campaigns = await Promise.all([
    prisma.campaign.upsert({
      where: { slug: 'ss26-cinnamon-edit' },
      update: {},
      create: {
        title: "SS '26 — Cinnamon Edit",
        slug: 'ss26-cinnamon-edit',
        description: 'Warm terracotta and ochre tones for the spring summer season. Handwoven Sambalpuri ikat meets natural dye.',
        isActive: true,
        publishedAt: daysAgo(10),
      },
    }),
    prisma.campaign.upsert({
      where: { slug: 'festive-2025' },
      update: {},
      create: {
        title: 'Festive 2025',
        slug: 'festive-2025',
        description: 'Celebrate every occasion with our limited festive edit. Block prints, kantha embroidery, and chanderi silks.',
        isActive: true,
        publishedAt: daysAgo(45),
      },
    }),
    prisma.campaign.upsert({
      where: { slug: 'the-earth-edit' },
      update: {},
      create: {
        title: 'The Earth Edit',
        slug: 'the-earth-edit',
        description: 'Naturally dyed with indigo, madder and turmeric. Zero synthetic dyes, 100% handcrafted.',
        isActive: true,
        publishedAt: daysAgo(90),
      },
    }),
  ]);
  const [campCinnamon, campFestive, campEarth] = campaigns;

  // ── 5. PRODUCTS ────────────────────────────────────────
  console.log('  → products');

  const products = await Promise.all([
    // Dresses
    prisma.product.upsert({
      where: { slug: 'sambalpuri-ikat-maxi' },
      update: {},
      create: {
        slug: 'sambalpuri-ikat-maxi',
        name: 'Sambalpuri Ikat Maxi',
        description: 'A floor-length maxi dress woven in authentic Sambalpuri ikat. Each piece takes 4–6 days to weave on handlooms in Odisha.',
        fabricStory: 'Woven by master weavers in Bargarh district, Odisha using traditional pit-loom technique. The resist-dyeing creates unique ikat patterns.',
        careInstructions: 'Hand wash cold. Dry in shade. Do not wring. Light iron.',
        categoryId: catDresses.id,
        campaignId: campCinnamon.id,
        priceInr: 8500,
        priceUsd: 102,
        compareAtPriceInr: 9800,
        isFeatured: true,
        status: ProductStatus.published,
        publishedAt: daysAgo(10),
        weightGrams: 380,
        leadDays: 5,
        metaTitle: 'Sambalpuri Ikat Maxi Dress | B Vaishali',
        metaDescription: 'Handwoven Sambalpuri ikat maxi dress. Authentic Odisha craft, natural dyes.',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'terracotta-kantha-dress' },
      update: {},
      create: {
        slug: 'terracotta-kantha-dress',
        name: 'Terracotta Kantha Dress',
        description: 'Hand-embroidered kantha stitch on pure cotton. The running-stitch pattern is inspired by Bankura temple motifs.',
        fabricStory: 'Kantha embroidery originates from Bengal and Odisha. Our artisans stitch each piece by hand, a process taking 2–3 days per garment.',
        careInstructions: 'Machine wash cold gentle. Do not bleach. Tumble dry low.',
        categoryId: catDresses.id,
        campaignId: campFestive.id,
        priceInr: 6200,
        compareAtPriceInr: 7000,
        isFeatured: true,
        status: ProductStatus.published,
        publishedAt: daysAgo(45),
        weightGrams: 290,
        leadDays: 7,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'rustic-linen-shift' },
      update: {},
      create: {
        slug: 'rustic-linen-shift',
        name: 'Rustic Linen Shift',
        description: 'A minimal shift dress in natural linen. Undyed and unbleached — the colour is exactly as the flax plant grows.',
        categoryId: catDresses.id,
        campaignId: campEarth.id,
        priceInr: 4800,
        isFeatured: false,
        status: ProductStatus.published,
        publishedAt: daysAgo(90),
        weightGrams: 240,
        leadDays: 3,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'indigo-block-wrap' },
      update: {},
      create: {
        slug: 'indigo-block-wrap',
        name: 'Indigo Block Wrap',
        description: 'Hand block-printed wrap dress using natural indigo. Each block is hand-carved from teak wood.',
        categoryId: catDresses.id,
        campaignId: campEarth.id,
        priceInr: 7100,
        compareAtPriceInr: 8200,
        isFeatured: true,
        status: ProductStatus.published,
        publishedAt: daysAgo(60),
        weightGrams: 310,
        leadDays: 7,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'ochre-sambalpuri-midi' },
      update: {},
      create: {
        slug: 'ochre-sambalpuri-midi',
        name: 'Ochre Sambalpuri Midi',
        description: 'A midi-length dress in warm ochre Sambalpuri cotton. Geometric ikat borders at hem and cuffs.',
        categoryId: catDresses.id,
        campaignId: campCinnamon.id,
        priceInr: 9200,
        compareAtPriceInr: 10500,
        isFeatured: true,
        status: ProductStatus.published,
        publishedAt: daysAgo(10),
        weightGrams: 360,
        leadDays: 5,
      },
    }),
    // Kurtas
    prisma.product.upsert({
      where: { slug: 'ajrak-block-print-kurta' },
      update: {},
      create: {
        slug: 'ajrak-block-print-kurta',
        name: 'Ajrak Block Print Kurta',
        description: 'Brick-red ajrak block print on soft mulmul cotton. Traditional resist-printing technique from Kutch.',
        categoryId: catKurtas.id,
        priceInr: 3400,
        isFeatured: false,
        status: ProductStatus.published,
        publishedAt: daysAgo(30),
        weightGrams: 180,
        leadDays: 3,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'ivory-chanderi-kurta' },
      update: {},
      create: {
        slug: 'ivory-chanderi-kurta',
        name: 'Ivory Chanderi Kurta',
        description: 'Sheer chanderi silk-cotton blend. Gold zari border at hem. Perfect for festive occasions.',
        categoryId: catKurtas.id,
        campaignId: campFestive.id,
        priceInr: 5600,
        compareAtPriceInr: 6200,
        isFeatured: false,
        status: ProductStatus.published,
        publishedAt: daysAgo(45),
        weightGrams: 160,
        leadDays: 5,
      },
    }),
    // Co-ords
    prisma.product.upsert({
      where: { slug: 'earthy-bandhani-co-ord' },
      update: {},
      create: {
        slug: 'earthy-bandhani-co-ord',
        name: 'Earthy Bandhani Co-ord Set',
        description: 'Tie-dye bandhani in warm earthy tones. Crop top paired with palazzo. 100% cotton.',
        categoryId: catCoords.id,
        priceInr: 5600,
        isFeatured: false,
        status: ProductStatus.published,
        publishedAt: daysAgo(20),
        weightGrams: 320,
        leadDays: 5,
      },
    }),
    // Draft product
    prisma.product.upsert({
      where: { slug: 'desert-rose-khadi-shift' },
      update: {},
      create: {
        slug: 'desert-rose-khadi-shift',
        name: 'Desert Rose Khadi Shift',
        description: 'Handspun khadi dyed in natural rose and madder. A minimalist silhouette for everyday wear.',
        categoryId: catDresses.id,
        campaignId: campEarth.id,
        priceInr: 3900,
        isFeatured: false,
        status: ProductStatus.draft,
        weightGrams: 220,
        leadDays: 3,
      },
    }),
  ]);

  const [pIkat, pKantha, pLinen, pIndigo, pOchre, pAjrak, pChanderi, pBandhani, pKhadi] = products;

  // ── 6. PRODUCT VARIANTS ────────────────────────────────
  console.log('  → product variants');

  const allVariants: { [productId: string]: any[] } = {};

  // Each product maps to a primary color (all variants of a product share one color)
  const productColors: Record<string, string> = {
    [pIkat.id]: 'Indigo',
    [pKantha.id]: 'Terracotta',
    [pLinen.id]: 'Ivory',
    [pIndigo.id]: 'Indigo',
    [pOchre.id]: 'Ochre',
    [pAjrak.id]: 'Brick Red',
    [pChanderi.id]: 'Ivory',
    [pBandhani.id]: 'Rust',
  };

  for (const product of [pIkat, pKantha, pLinen, pIndigo, pOchre, pAjrak, pChanderi, pBandhani]) {
    const productSizes = product.slug.includes('khadi') || product.slug.includes('linen')
      ? ['XS', 'S', 'M', 'L']
      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    const color = productColors[product.id] ?? null;

    const variants = await Promise.all(
      productSizes.map((size, i) =>
        prisma.productVariant.upsert({
          where: { sku: `${product.slug.toUpperCase().replace(/-/g, '_')}_${size}` },
          update: { color },
          create: {
            productId: product.id,
            size,
            color,
            sku: `${product.slug.toUpperCase().replace(/-/g, '_')}_${size}`,
            stockQty: [10, 15, 20, 18, 8, 4][i] ?? 5,
            lowStockThreshold: 3,
          },
        })
      )
    );
    allVariants[product.id] = variants;
  }

  // ── 7. PRODUCT IMAGES ──────────────────────────────────
  console.log('  → product images');

  const imageData = [
    { product: pIkat, keys: ['products/ikat-maxi-1.jpg', 'products/ikat-maxi-2.jpg', 'products/ikat-maxi-fabric.jpg'] },
    { product: pKantha, keys: ['products/kantha-dress-1.jpg', 'products/kantha-dress-2.jpg'] },
    { product: pLinen, keys: ['products/linen-shift-1.jpg', 'products/linen-shift-fabric.jpg'] },
    { product: pIndigo, keys: ['products/indigo-wrap-1.jpg', 'products/indigo-wrap-2.jpg', 'products/indigo-detail.jpg'] },
    { product: pOchre, keys: ['products/ochre-midi-1.jpg', 'products/ochre-midi-2.jpg'] },
    { product: pAjrak, keys: ['products/ajrak-kurta-1.jpg', 'products/ajrak-kurta-fabric.jpg'] },
    { product: pChanderi, keys: ['products/chanderi-kurta-1.jpg'] },
    { product: pBandhani, keys: ['products/bandhani-coord-1.jpg', 'products/bandhani-coord-2.jpg'] },
  ];

  for (const { product, keys } of imageData) {
    for (let i = 0; i < keys.length; i++) {
      const existing = await prisma.productImage.findFirst({ where: { productId: product.id, r2ObjectKey: keys[i] } });
      if (!existing) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            r2ObjectKey: keys[i],
            altText: `${product.name} — view ${i + 1}`,
            isPrimary: i === 0,
            sortOrder: i,
            imageType: i === 0 ? ImageType.gallery : i === keys.length - 1 && keys[i].includes('fabric') ? ImageType.fabric_detail : ImageType.gallery,
          },
        });
      }
    }
  }

  // ── 8. PRODUCT TAGS ────────────────────────────────────
  console.log('  → product tags');

  const productTagData = [
    { product: pIkat, tags: [tagIkat, tagHandwoven, tagNew, tagFestive] },
    { product: pKantha, tags: [tagKantha, tagBest, tagFestive] },
    { product: pLinen, tags: [tagNatDye, tagEveryday] },
    { product: pIndigo, tags: [tagBlock, tagNatDye, tagLimited] },
    { product: pOchre, tags: [tagIkat, tagHandwoven, tagNew, tagFestive] },
    { product: pAjrak, tags: [tagBlock, tagEveryday] },
    { product: pChanderi, tags: [tagFestive, tagLimited] },
    { product: pBandhani, tags: [tagEveryday] },
  ];

  for (const { product, tags: tagList } of productTagData) {
    for (const tag of tagList) {
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: product.id, tagId: tag.id } },
        update: {},
        create: { productId: product.id, tagId: tag.id },
      });
    }
  }

  // ── 9. ADDRESSES ───────────────────────────────────────
  console.log('  → addresses');

  const addresses = await Promise.all(
    customers.map((customer, i) => {
      const addressData = [
        { label: 'Home', fullName: 'Ananya Sharma', phone: '+919811111001', line1: '12, Kasturba Gandhi Marg', city: 'New Delhi', state: 'Delhi', pincode: '110001', district: 'Central Delhi' },
        { label: 'Home', fullName: 'Meera Patel', phone: '+919811111002', line1: '45, Relief Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', district: 'Ahmedabad' },
        { label: 'Work', fullName: 'Kavitha Reddy', phone: '+919811111003', line1: '78, MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', district: 'Bengaluru Urban' },
        { label: 'Home', fullName: 'Sunita Mishra', phone: '+919811111004', line1: '3, Patel Nagar', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', district: 'Bhopal' },
        { label: 'Home', fullName: 'Deepa Iyer', phone: '+919811111005', line1: '22, Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', district: 'Chennai' },
      ][i];
      return prisma.address.upsert({
        where: { id: customer.id }, // use customer id as placeholder — will just ensure uniqueness
        update: {},
        create: {
          userId: customer.id,
          ...addressData,
          isDefault: true,
          isServiceable: true,
        },
      }).catch(() =>
        prisma.address.findFirst({ where: { userId: customer.id } })
      );
    })
  );

  // ── 10. DISCOUNT CODES ─────────────────────────────────
  console.log('  → discount codes');

  const discounts = await Promise.all([
    prisma.discountCode.upsert({
      where: { code: 'WELCOME10' },
      update: {},
      create: {
        code: 'WELCOME10',
        discountType: DiscountType.percent,
        discountValue: 10,
        maxDiscountCap: 500,
        minOrderValue: 1500,
        usageLimit: 500,
        perUserLimit: 1,
        validFrom: daysAgo(180),
        validUntil: daysFromNow(180),
        isActive: true,
        createdBy: admin.id,
      },
    }),
    prisma.discountCode.upsert({
      where: { code: 'FLAT500' },
      update: {},
      create: {
        code: 'FLAT500',
        discountType: DiscountType.flat,
        discountValue: 500,
        minOrderValue: 3000,
        usageLimit: 200,
        perUserLimit: 1,
        validFrom: daysAgo(30),
        validUntil: daysFromNow(30),
        isActive: true,
        createdBy: bvAdmin.id,
      },
    }),
    prisma.discountCode.upsert({
      where: { code: 'FESTIVE20' },
      update: {},
      create: {
        code: 'FESTIVE20',
        discountType: DiscountType.percent,
        discountValue: 20,
        maxDiscountCap: 1500,
        minOrderValue: 5000,
        usageLimit: 100,
        perUserLimit: 1,
        validFrom: daysAgo(10),
        validUntil: daysFromNow(20),
        isActive: true,
        createdBy: admin.id,
      },
    }),
    prisma.discountCode.upsert({
      where: { code: 'FREESHIP' },
      update: {},
      create: {
        code: 'FREESHIP',
        discountType: DiscountType.free_shipping,
        discountValue: 0,
        minOrderValue: 2000,
        isActive: true,
        createdBy: bvAdmin.id,
      },
    }),
  ]);

  // ── 11. ORDERS ─────────────────────────────────────────
  console.log('  → orders');

  const orderStatusSets: Array<{ status: OrderStatus; payment: PaymentStatus }> = [
    { status: OrderStatus.delivered, payment: PaymentStatus.paid },
    { status: OrderStatus.shipped, payment: PaymentStatus.paid },
    { status: OrderStatus.processing, payment: PaymentStatus.paid },
    { status: OrderStatus.placed, payment: PaymentStatus.pending },
    { status: OrderStatus.cancelled, payment: PaymentStatus.refunded },
  ];

  const orderDefs = [
    { customer: customers[0], address: addresses[0], product: pIkat, variant: allVariants[pIkat.id]?.[2], price: 8500, statusIdx: 0, daysBack: 30, coupon: null },
    { customer: customers[1], address: addresses[1], product: pKantha, variant: allVariants[pKantha.id]?.[1], price: 6200, statusIdx: 1, daysBack: 10, coupon: discounts[0] },
    { customer: customers[2], address: addresses[2], product: pIndigo, variant: allVariants[pIndigo.id]?.[3], price: 7100, statusIdx: 2, daysBack: 5, coupon: null },
    { customer: customers[3], address: addresses[3], product: pOchre, variant: allVariants[pOchre.id]?.[2], price: 9200, statusIdx: 3, daysBack: 1, coupon: discounts[1] },
    { customer: customers[4], address: addresses[4], product: pLinen, variant: allVariants[pLinen.id]?.[0], price: 4800, statusIdx: 4, daysBack: 20, coupon: null },
    { customer: customers[0], address: addresses[0], product: pAjrak, variant: allVariants[pAjrak.id]?.[1], price: 3400, statusIdx: 0, daysBack: 60, coupon: null },
    { customer: customers[1], address: addresses[1], product: pChanderi, variant: allVariants[pChanderi.id]?.[2], price: 5600, statusIdx: 1, daysBack: 15, coupon: discounts[2] },
  ];

  const createdOrders = [];
  for (let i = 0; i < orderDefs.length; i++) {
    const def = orderDefs[i];
    if (!def.address || !def.variant) continue;

    const orderNumber = `BV${String(2500 + i).padStart(6, '0')}`;
    const discount = def.coupon ? (def.coupon.discountType === 'percent' ? Math.min(def.price * Number(def.coupon.discountValue) / 100, Number(def.coupon.maxDiscountCap ?? 9999)) : Number(def.coupon.discountValue)) : 0;
    const shipping = def.price >= 2500 ? 0 : 99;
    const total = def.price - discount + shipping;

    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (existing) { createdOrders.push(existing); continue; }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: def.customer.id,
        addressId: (def.address as any).id,
        couponId: def.coupon?.id ?? null,
        subtotal: def.price,
        discountAmount: discount,
        shippingCharge: shipping,
        totalAmount: total,
        itemCount: 1,
        paymentStatus: orderStatusSets[def.statusIdx].payment,
        orderStatus: orderStatusSets[def.statusIdx].status,
        createdAt: daysAgo(def.daysBack),
        items: {
          create: {
            productId: def.product.id,
            variantId: def.variant.id,
            quantity: 1,
            unitPrice: def.price,
            snapshotName: def.product.name,
          },
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: 'placed',
            changedBy: def.customer.id,
            changedAt: daysAgo(def.daysBack),
          },
        },
      },
    });
    createdOrders.push(order);

    // Add further status history for delivered/shipped orders
    if (def.statusIdx === 0) {
      await prisma.orderStatusHistory.createMany({
        data: [
          { orderId: order.id, fromStatus: 'placed', toStatus: 'confirmed', changedBy: admin.id, changedAt: daysAgo(def.daysBack - 1) },
          { orderId: order.id, fromStatus: 'confirmed', toStatus: 'processing', changedBy: admin.id, changedAt: daysAgo(def.daysBack - 2) },
          { orderId: order.id, fromStatus: 'processing', toStatus: 'shipped', changedBy: admin.id, changedAt: daysAgo(def.daysBack - 4) },
          { orderId: order.id, fromStatus: 'shipped', toStatus: 'delivered', changedBy: admin.id, changedAt: daysAgo(def.daysBack - 7) },
        ],
      });
    }

    // Invoice for paid orders
    if (orderStatusSets[def.statusIdx].payment === PaymentStatus.paid) {
      await prisma.invoice.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          invoiceNumber: `INV-2025-${String(1000 + i)}`,
          r2ObjectKey: `invoices/INV-2025-${1000 + i}.pdf`,
          generatedAt: daysAgo(def.daysBack - 1),
        },
      });
    }

    // Shipment for shipped/delivered
    const currentStatus = orderStatusSets[def.statusIdx].status;
    if (currentStatus === OrderStatus.shipped || currentStatus === OrderStatus.delivered) {
      await prisma.shipment.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          logisticsProvider: 'Delhivery',
          awbNumber: `DEL${String(100000 + i)}`,
          trackingUrl: `https://www.delhivery.com/track/DEL${100000 + i}`,
          status: orderStatusSets[def.statusIdx].status === OrderStatus.delivered ? ShipmentStatus.delivered : ShipmentStatus.in_transit,
          lastLocation: orderStatusSets[def.statusIdx].status === OrderStatus.delivered ? 'Delivered to customer' : 'In transit — Mumbai Hub',
          weightGrams: def.product.weightGrams ?? 300,
          shippedAt: daysAgo(def.daysBack - 4),
          estimatedDelivery: new Date(daysAgo(def.daysBack - 7).toISOString().split('T')[0]),
          deliveredAt: orderStatusSets[def.statusIdx].status === OrderStatus.delivered ? daysAgo(def.daysBack - 7) : null,
          events: [
            { timestamp: daysAgo(def.daysBack - 4).toISOString(), location: 'Bhubaneswar', status: 'Picked up' },
            { timestamp: daysAgo(def.daysBack - 5).toISOString(), location: 'Kolkata Hub', status: 'In transit' },
          ],
        },
      });
    }

    // Coupon usage for discount orders
    if (def.coupon && orderStatusSets[def.statusIdx].payment === PaymentStatus.paid) {
      await prisma.couponUsage.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          couponId: def.coupon.id,
          userId: def.customer.id,
          orderId: order.id,
          discountApplied: discount,
        },
      });
      await prisma.discountCode.update({
        where: { id: def.coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }
  }

  // ── 12. WISHLIST ITEMS ─────────────────────────────────
  console.log('  → wishlist items');

  const wishlistData = [
    { user: customers[0], product: pOchre },
    { user: customers[0], product: pIndigo },
    { user: customers[1], product: pIkat },
    { user: customers[1], product: pChanderi },
    { user: customers[2], product: pKantha },
    { user: customers[3], product: pBandhani },
    { user: customers[3], product: pLinen },
    { user: customers[4], product: pAjrak },
  ];

  for (const { user, product } of wishlistData) {
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      update: {},
      create: { userId: user.id, productId: product.id },
    });
  }

  // ── 13. FLASH SALES ────────────────────────────────────
  console.log('  → flash sales');

  const flashSaleData = [
    { product: pKantha, variant: allVariants[pKantha.id]?.[2], sale: 4960, orig: 6200, pct: 20, start: daysAgo(0), end: daysFromNow(2) },
    { product: pLinen, variant: allVariants[pLinen.id]?.[1], sale: 3840, orig: 4800, pct: 20, start: daysAgo(1), end: daysFromNow(1) },
    { product: pAjrak, variant: null, sale: 2720, orig: 3400, pct: 20, start: daysFromNow(1), end: daysFromNow(3) },
  ];

  for (const fs of flashSaleData) {
    if (!fs.variant && fs.product.slug !== 'ajrak-block-print-kurta') continue;
    const existingFs = await prisma.flashSale.findFirst({ where: { productId: fs.product.id, startsAt: fs.start } });
    if (!existingFs) {
      await prisma.flashSale.create({
        data: {
          productId: fs.product.id,
          variantId: fs.variant?.id ?? null,
          salePriceInr: fs.sale,
          originalPriceInr: fs.orig,
          discountPercent: fs.pct,
          startsAt: fs.start,
          endsAt: fs.end,
          isActive: true,
        },
      });
    }
  }

  // ── 14. PROMOTIONAL BANNERS ────────────────────────────
  console.log('  → promotional banners');

  const bannerData = [
    { title: "SS '26 Cinnamon Edit", headline: 'New Season, New Craft', ctaText: 'Shop Now', ctaUrl: '/designs?campaign=ss26-cinnamon-edit', r2Key: 'banners/ss26-hero.jpg', position: BannerPosition.hero, sort: 1 },
    { title: 'Festive 2025 Edit', headline: 'Celebrate in Craft', ctaText: 'Explore', ctaUrl: '/designs?campaign=festive-2025', r2Key: 'banners/festive-hero.jpg', position: BannerPosition.hero, sort: 2 },
    { title: 'Free Shipping Banner', headline: 'Free shipping over ₹2,500', ctaText: null, ctaUrl: null, r2Key: 'banners/shipping-bar.jpg', position: BannerPosition.announcement_bar, sort: 1 },
    { title: 'Earth Edit Mid-Page', headline: 'Naturally Dyed. Naturally Beautiful.', ctaText: 'Discover', ctaUrl: '/designs?campaign=the-earth-edit', r2Key: 'banners/earth-edit-mid.jpg', position: BannerPosition.mid_page, sort: 1 },
  ];

  for (const b of bannerData) {
    const existing = await prisma.promotionalBanner.findFirst({ where: { title: b.title } });
    if (!existing) {
      await prisma.promotionalBanner.create({
        data: {
          title: b.title,
          headline: b.headline,
          ctaText: b.ctaText ?? undefined,
          ctaUrl: b.ctaUrl ?? undefined,
          imageR2Key: b.r2Key,
          position: b.position,
          sortOrder: b.sort,
          isActive: true,
          validFrom: daysAgo(10),
          validUntil: daysFromNow(30),
        },
      });
    }
  }

  // ── 15. MARKETING BROADCASTS ───────────────────────────
  console.log('  → marketing broadcasts');

  const broadcastData = [
    { title: "SS '26 Launch Announcement", channel: BroadcastChannel.both, template: 'ss26_launch', segment: TargetSegment.all_customers, status: BroadcastStatus.sent, sentAt: daysAgo(10), recipients: 1240, opens: 310 },
    { title: 'Festive Sale — 20% Off', channel: BroadcastChannel.whatsapp, template: 'festive_sale_20', segment: TargetSegment.wishlist_holders, status: BroadcastStatus.sent, sentAt: daysAgo(5), recipients: 420, opens: 180 },
    { title: 'Re-engage Inactive Buyers', channel: BroadcastChannel.email, template: null, segment: TargetSegment.inactive_30d, status: BroadcastStatus.scheduled, sentAt: null, recipients: null, opens: 0 },
    { title: 'Thank You — Recent Buyers', channel: BroadcastChannel.whatsapp, template: 'post_purchase_thankyou', segment: TargetSegment.recent_buyers, status: BroadcastStatus.sent, sentAt: daysAgo(2), recipients: 87, opens: 62 },
  ];

  for (const bc of broadcastData) {
    const existing = await prisma.marketingBroadcast.findFirst({ where: { title: bc.title } });
    if (!existing) {
      await prisma.marketingBroadcast.create({
        data: {
          title: bc.title,
          channel: bc.channel,
          watiTemplateName: bc.template ?? undefined,
          targetSegment: bc.segment,
          status: bc.status,
          scheduledAt: bc.sentAt ?? daysFromNow(3),
          sentAt: bc.sentAt ?? undefined,
          recipientCount: bc.recipients ?? undefined,
          openCount: bc.opens,
          createdBy: admin.id,
        },
      });
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('  Admin accounts:');
  console.log('    lingarajmahanta24@gmail.com  /  Admin@123  (admin)');
  console.log('    me@bvaishali.com             /  Admin@123  (admin)');
  console.log('    manager@bvaishali.com        /  Admin@123  (manager)');
  console.log('\n  Customer accounts (password: User@1234):');
  console.log('    ananya.sharma@gmail.com');
  console.log('    meera.patel@gmail.com');
  console.log('    kavitha.reddy@gmail.com');
  console.log('    sunita.mishra@gmail.com');
  console.log('    deepa.iyer@gmail.com');
  console.log('\n  Products: 9  |  Orders: 7  |  Discount codes: 4  |  Banners: 4');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
