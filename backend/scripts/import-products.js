#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const mime = require('mime-types');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const PRODUCT_UID = 'api::product.product';
const CATEGORY_UID = 'api::category.category';
const UPLOAD_FILE_UID = 'plugin::upload.file';
const UPLOAD_FOLDER_UID = 'plugin::upload.folder';

const appDir = path.resolve(__dirname, '..');
const defaultProductsFile = path.join(appDir, 'src/data/products.json');
const defaultMediaMaxBytes = 25 * 1024 * 1024;
const defaultMediaConcurrency = 2;

function usage() {
  console.log(`
Import products from JSON into Strapi.

Usage:
  npm run import:products
  npm run import:products -- --file ./src/data/products.json
  npm run import:products -- --publish
  npm run import:products -- --import-media

Options:
  --file <path>             JSON file to import. Defaults to ./src/data/products.json.
  --publish                 Create/update products with published status. Defaults to draft.
  --dry-run                 Validate and report intended changes without writing products.
  --import-media            Download product.images URLs, upload them to Media Library, and attach Product.images.
  --force-media             Upload media even when a deterministic Media Library file name already exists.
  --media-concurrency <n>   Remote image uploads per product. Defaults to 2.
  --media-max-bytes <n>     Max remote image size in bytes. Defaults to 26214400.

Media folders:
  Imported images are stored under /products/{categorySlug}/{productSku}.
`);
}

function parseArgs(argv) {
  const options = {
    file: process.env.PRODUCTS_JSON || defaultProductsFile,
    dryRun: false,
    forceMedia: false,
    importMedia: process.env.PRODUCT_IMPORT_MEDIA === 'true',
    mediaConcurrency: Number(process.env.PRODUCT_MEDIA_CONCURRENCY || defaultMediaConcurrency),
    mediaMaxBytes: Number(process.env.PRODUCT_MEDIA_MAX_BYTES || defaultMediaMaxBytes),
    status: process.env.PRODUCT_IMPORT_STATUS === 'published' ? 'published' : 'draft',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--import-media') {
      options.importMedia = true;
      continue;
    }

    if (arg === '--force-media') {
      options.forceMedia = true;
      continue;
    }

    if (arg === '--publish') {
      options.status = 'published';
      continue;
    }

    if (arg === '--file') {
      if (!argv[index + 1]) {
        throw new Error('--file requires a path');
      }
      options.file = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--file=')) {
      options.file = arg.slice('--file='.length);
      continue;
    }

    if (arg === '--media-concurrency') {
      if (!argv[index + 1]) {
        throw new Error('--media-concurrency requires a number');
      }
      options.mediaConcurrency = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--media-concurrency=')) {
      options.mediaConcurrency = Number(arg.slice('--media-concurrency='.length));
      continue;
    }

    if (arg === '--media-max-bytes') {
      if (!argv[index + 1]) {
        throw new Error('--media-max-bytes requires a number');
      }
      options.mediaMaxBytes = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--media-max-bytes=')) {
      options.mediaMaxBytes = Number(arg.slice('--media-max-bytes='.length));
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!Number.isInteger(options.mediaConcurrency) || options.mediaConcurrency < 1) {
    throw new Error('--media-concurrency must be a positive integer');
  }

  if (!Number.isInteger(options.mediaMaxBytes) || options.mediaMaxBytes < 1) {
    throw new Error('--media-max-bytes must be a positive integer');
  }

  options.file = path.resolve(appDir, options.file);
  return options;
}

function readProductsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Products file not found: ${filePath}`);
  }

  const rawJson = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(rawJson);

  if (!parsed || !Array.isArray(parsed.products)) {
    throw new Error('Expected JSON shape: { "schemaVersion": number, "products": [...] }');
  }

  return parsed;
}

function hasDraftAndPublish(contentType) {
  return Boolean(contentType?.options?.draftAndPublish);
}

function getAttributeNames(strapi, uid) {
  return Object.keys(strapi.contentType(uid).attributes || {});
}

function hasAttribute(strapi, uid, attributeName) {
  return Boolean(strapi.contentType(uid).attributes?.[attributeName]);
}

function chooseCategoryMatchField(strapi) {
  const attributes = strapi.contentType(CATEGORY_UID).attributes || {};
  const slugAttribute = attributes.slug;

  if (!slugAttribute || !['string', 'uid'].includes(slugAttribute.type)) {
    throw new Error(
      `Cannot match categories. Product.categoryKey is expected to match Category.slug. Available Category fields: ${Object.keys(
        attributes
      ).join(', ')}`
    );
  }

  return 'slug';
}

function toBlocks(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return String(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: 'paragraph',
      children: [{ type: 'text', text: paragraph }],
    }));
}

function setIfPresent(data, product, fieldName) {
  if (Object.prototype.hasOwnProperty.call(product, fieldName)) {
    data[fieldName] = product[fieldName];
  }
}

function buildProductData(strapi, product, category, mediaFiles, options, warned) {
  const productFields = new Set(getAttributeNames(strapi, PRODUCT_UID));
  const data = {};

  for (const fieldName of ['slug', 'sku', 'name', 'brand', 'model', 'price', 'attributes', 'inStock']) {
    if (productFields.has(fieldName)) {
      setIfPresent(data, product, fieldName);
    }
  }

  if (productFields.has('description')) {
    data.description = toBlocks(product.description);
  }

  if (category && productFields.has('category')) {
    data.category = { documentId: category.documentId };
  }

  if (options.importMedia) {
    if (productFields.has('images')) {
      data.images = mediaFiles.map((file) => file.id);
    } else if (!warned.imagesField) {
      console.warn('[warn] Product.images field does not exist. Uploaded media cannot be attached to products.');
      warned.imagesField = true;
    }
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    if (productFields.has('externalImages')) {
      data.externalImages = product.images;
    } else if (!options.importMedia && !warned.externalImages) {
      console.warn(
        '[warn] Product.images contains external URLs. Skipping Media import. Add Product.externalImages as JSON if you want to keep these URLs temporarily.'
      );
      warned.externalImages = true;
    }
  }

  if (Array.isArray(product.videos) && product.videos.length > 0 && !warned.videos) {
    console.warn('[warn] Product.videos is a Media field. Skipping video URL import until media ingestion is implemented.');
    warned.videos = true;
  }

  return data;
}

function getImageUrl(image) {
  if (typeof image === 'string') {
    return image;
  }

  if (image && typeof image === 'object' && typeof image.url === 'string') {
    return image.url;
  }

  return null;
}

function normalizeImageEntries(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter((image) => getImageUrl(image));
}

function sanitizeFilenamePart(value) {
  return (
    String(value || '')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 90) || 'image'
  );
}

function sanitizeFolderName(value, fallback) {
  const normalized = String(value || fallback || '')
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120);

  return normalized || fallback;
}

function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
}

function ensureExtension(ext) {
  if (!ext) {
    return '.jpg';
  }

  const normalized = ext.startsWith('.') ? ext : `.${ext}`;
  return normalized.toLowerCase();
}

function extensionFromMime(mimetype) {
  const extension = mime.extension(mimetype || '');
  return extension ? `.${extension}` : '';
}

function filenameFromUrl(value) {
  try {
    const url = new URL(value);
    const queryFilename = url.searchParams.get('filename');

    if (queryFilename) {
      return path.basename(decodeURIComponent(queryFilename));
    }

    const pathnameFilename = path.basename(decodeURIComponent(url.pathname));
    return pathnameFilename && pathnameFilename !== '/' ? pathnameFilename : '';
  } catch {
    return '';
  }
}

function buildMediaFileName(product, image, index, ext) {
  const imageLabel =
    typeof image === 'object' && image !== null ? image.role || image.label || image.alt : undefined;
  const suffix = sanitizeFilenamePart(imageLabel || `image-${index + 1}`);
  const number = String(index + 1).padStart(2, '0');
  const sourceUrl = getImageUrl(image) || '';
  const identity = shortHash(`${product.slug}:${number}:${sourceUrl}`);

  return `${sanitizeFilenamePart(product.slug)}-${identity}-${number}-${suffix}${ensureExtension(ext)}`;
}

function buildLegacyMediaFileName(product, image, index, ext) {
  const imageLabel =
    typeof image === 'object' && image !== null ? image.role || image.label || image.alt : undefined;
  const suffix = sanitizeFilenamePart(imageLabel || `image-${index + 1}`);
  const number = String(index + 1).padStart(2, '0');

  return `${sanitizeFilenamePart(product.slug)}-${number}-${suffix}${ensureExtension(ext)}`;
}

function isYandexDiskUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === 'disk.yandex.ru' ||
      hostname.endsWith('.disk.yandex.ru') ||
      hostname === 'disk.yandex.com' ||
      hostname.endsWith('.disk.yandex.com') ||
      hostname === 'yadi.sk'
    );
  } catch {
    return false;
  }
}

async function resolveDownloadUrl(strapi, sourceUrl) {
  if (!isYandexDiskUrl(sourceUrl)) {
    return sourceUrl;
  }

  const apiUrl = new URL('https://cloud-api.yandex.net/v1/disk/public/resources/download');
  apiUrl.searchParams.set('public_key', sourceUrl);

  const doFetch = typeof strapi.fetch === 'function' ? strapi.fetch : fetch;
  const response = await doFetch(apiUrl, {
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Yandex Disk API returned ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  if (!body.href) {
    throw new Error('Yandex Disk API did not return a download href');
  }

  return body.href;
}

async function findExistingMediaByName(strapi, name) {
  return strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { name },
  });
}

async function updateExistingMediaLocation(strapi, file, folder, stats, nextName = file.name) {
  const needsMove = folder && file.folderPath !== folder.path;
  const needsRename = nextName && file.name !== nextName;

  if (!needsMove && !needsRename) {
    return file;
  }

  const updatedFile = await strapi.plugin('upload').service('upload').updateFileInfo(file.id, {
    folder: folder?.id,
    name: nextName,
  });

  if (needsMove) {
    stats.mediaMoved += 1;
    console.log(`[media:moved] ${file.name} -> ${folder.displayPath}`);
  }

  if (needsRename) {
    stats.mediaRenamed += 1;
    console.log(`[media:renamed] ${file.name} -> ${nextName}`);
  }

  return updatedFile;
}

async function findReusableMedia(strapi, mediaName, legacyMediaName, folder, stats) {
  const existing = await findExistingMediaByName(strapi, mediaName);

  if (existing) {
    stats.mediaReused += 1;
    console.log(`[media:reused] ${mediaName}`);
    return updateExistingMediaLocation(strapi, existing, folder, stats);
  }

  if (legacyMediaName && legacyMediaName !== mediaName) {
    const legacyExisting = await findExistingMediaByName(strapi, legacyMediaName);

    if (legacyExisting) {
      stats.mediaReused += 1;
      console.log(`[media:reused:legacy] ${legacyMediaName}`);
      return updateExistingMediaLocation(strapi, legacyExisting, folder, stats, mediaName);
    }
  }

  return null;
}

function mediaFileInfo(product, image, name, folder) {
  const alt = typeof image === 'object' && image !== null ? image.alt : null;
  const label = typeof image === 'object' && image !== null ? image.label || image.role : null;

  return {
    name,
    alternativeText: alt || product.name || name,
    caption: label || null,
    folder: folder?.id,
  };
}

function getProductSkuFolderName(product) {
  return sanitizeFolderName(product.sku || product.model || product.slug, product.slug);
}

function getProductMediaFolderPath(category, product) {
  const categorySlug = sanitizeFolderName(category.slug || product.categoryKey, product.categoryKey);
  const productSku = getProductSkuFolderName(product);

  return `/products/${categorySlug}/${productSku}`;
}

async function findMediaFolder(strapi, name, parentId) {
  return strapi.db.query(UPLOAD_FOLDER_UID).findOne({
    where: {
      name,
      parent: parentId ?? null,
    },
  });
}

async function ensureMediaFolder(strapi, name, parentFolder, options, stats, folderCache) {
  const parentId = parentFolder?.id ?? null;
  const cacheKey = `${parentId ?? 'root'}:${name}`;

  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  if (options.dryRun) {
    const parentDisplayPath = parentFolder?.displayPath ?? '';
    const dryRunFolder = {
      id: 0,
      name,
      path: parentFolder ? `${parentFolder.path}/dry-${name}` : `/dry-${name}`,
      displayPath: `${parentDisplayPath}/${name}`,
    };

    folderCache.set(cacheKey, dryRunFolder);
    stats.foldersQueued += 1;
    console.log(`[dry-run:folder] ensure ${dryRunFolder.displayPath}`);
    return dryRunFolder;
  }

  const existingFolder = await findMediaFolder(strapi, name, parentId);

  if (existingFolder) {
    const folder = {
      ...existingFolder,
      displayPath: `${parentFolder?.displayPath ?? ''}/${existingFolder.name}`,
    };

    folderCache.set(cacheKey, folder);
    stats.foldersReused += 1;
    return folder;
  }

  const createdFolder = await strapi.plugin('upload').service('folder').create({
    name,
    parent: parentId,
  });
  const folder = {
    ...createdFolder,
    displayPath: `${parentFolder?.displayPath ?? ''}/${createdFolder.name}`,
  };

  folderCache.set(cacheKey, folder);
  stats.foldersCreated += 1;
  console.log(`[folder:created] ${folder.displayPath}`);
  return folder;
}

async function ensureProductMediaFolder(strapi, category, product, options, stats, folderCache) {
  const productsFolder = await ensureMediaFolder(strapi, 'products', null, options, stats, folderCache);
  const categoryFolder = await ensureMediaFolder(
    strapi,
    sanitizeFolderName(category.slug || product.categoryKey, product.categoryKey),
    productsFolder,
    options,
    stats,
    folderCache
  );

  return ensureMediaFolder(strapi, getProductSkuFolderName(product), categoryFolder, options, stats, folderCache);
}

async function uploadRemoteImage(strapi, product, image, index, options, stats, folder) {
  const sourceUrl = getImageUrl(image);

  if (!sourceUrl) {
    stats.mediaFailed += 1;
    console.warn(`[warn] Product "${product.slug}" image ${index + 1} has no URL. Skipping image.`);
    return null;
  }

  if (options.dryRun) {
    const dryRunName = buildMediaFileName(product, image, index, '.jpg');
    stats.mediaQueued += 1;
    console.log(`[dry-run:media] upload ${sourceUrl} -> ${dryRunName}`);
    return { id: 0, name: dryRunName };
  }

  let tmpDir;

  try {
    const downloadUrl = await resolveDownloadUrl(strapi, sourceUrl);
    const filename = filenameFromUrl(downloadUrl);
    let mediaName = buildMediaFileName(product, image, index, path.extname(filename));
    let legacyMediaName = buildLegacyMediaFileName(product, image, index, path.extname(filename));

    if (!options.forceMedia) {
      const reusableMedia = await findReusableMedia(strapi, mediaName, legacyMediaName, folder, stats);

      if (reusableMedia) {
        return reusableMedia;
      }
    }

    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'strapi-product-media-'));

    const { file } = await strapi
      .plugin('upload')
      .service('file')
      .fetchUrlToInputFile(downloadUrl, tmpDir, options.mediaMaxBytes);
    const finalExt = path.extname(filename) || path.extname(file.originalFilename || '') || extensionFromMime(file.mimetype);
    mediaName = buildMediaFileName(product, image, index, finalExt);
    legacyMediaName = buildLegacyMediaFileName(product, image, index, finalExt);

    if (!options.forceMedia) {
      const reusableMedia = await findReusableMedia(strapi, mediaName, legacyMediaName, folder, stats);

      if (reusableMedia) {
        return reusableMedia;
      }
    }

    file.originalFilename = mediaName;

    const [uploadedFile] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: {
          fileInfo: mediaFileInfo(product, image, mediaName, folder),
        },
        files: file,
      });

    if (!uploadedFile?.mime?.startsWith('image/')) {
      stats.mediaFailed += 1;
      console.warn(`[warn] Uploaded file "${mediaName}" is not an image (${uploadedFile?.mime || 'unknown'}). Removing it.`);

      if (uploadedFile) {
        await strapi.plugin('upload').service('upload').remove(uploadedFile);
      }

      return null;
    }

    stats.mediaUploaded += 1;
    console.log(`[media:uploaded] ${mediaName}`);
    return uploadedFile;
  } catch (error) {
    stats.mediaFailed += 1;
    console.warn(`[warn] Failed to import image for product "${product.slug}" from ${sourceUrl}: ${error.message}`);
    return null;
  } finally {
    if (tmpDir) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function uploadProductImages(strapi, category, product, options, stats, folderCache) {
  if (!options.importMedia) {
    return [];
  }

  const images = normalizeImageEntries(product.images);

  if (images.length === 0) {
    return [];
  }

  const productFolder = await ensureProductMediaFolder(strapi, category, product, options, stats, folderCache);
  console.log(`[media:folder] ${getProductMediaFolderPath(category, product)}`);

  const mediaFiles = await mapWithConcurrency(images, options.mediaConcurrency, (image, index) =>
    uploadRemoteImage(strapi, product, image, index, options, stats, productFolder)
  );

  return mediaFiles.filter(Boolean);
}

async function findFirstByField(strapi, uid, fieldName, value, status) {
  const params = {
    filters: { [fieldName]: { $eq: value } },
  };

  if (status) {
    params.status = status;
  }

  return strapi.documents(uid).findFirst(params);
}

async function findCategory(strapi, matchField, categoryKey, status) {
  if (!categoryKey) {
    return null;
  }

  const categoryContentType = strapi.contentType(CATEGORY_UID);
  const searchStatuses = hasDraftAndPublish(categoryContentType) ? [status] : [undefined];

  for (const searchStatus of searchStatuses) {
    const category = await findFirstByField(strapi, CATEGORY_UID, matchField, categoryKey, searchStatus);

    if (category) {
      return category;
    }
  }

  return null;
}

async function findExistingProduct(strapi, slug, status) {
  const productContentType = strapi.contentType(PRODUCT_UID);
  const searchStatuses = hasDraftAndPublish(productContentType)
    ? [status, status === 'draft' ? 'published' : 'draft']
    : [undefined];

  for (const searchStatus of searchStatuses) {
    const product = await findFirstByField(strapi, PRODUCT_UID, 'slug', slug, searchStatus);

    if (product) {
      return product;
    }
  }

  return null;
}

async function importProducts(strapi, payload, options) {
  const stats = {
    created: 0,
    foldersCreated: 0,
    foldersQueued: 0,
    foldersReused: 0,
    mediaFailed: 0,
    mediaMoved: 0,
    mediaQueued: 0,
    mediaRenamed: 0,
    mediaReused: 0,
    mediaUploaded: 0,
    updated: 0,
    skipped: 0,
    missingCategories: 0,
  };
  const warned = {
    externalImages: false,
    imagesField: false,
    videos: false,
  };
  const folderCache = new Map();
  const categoryMatchField = chooseCategoryMatchField(strapi);

  console.log(`[info] Category matching field: ${categoryMatchField}`);
  console.log(`[info] Product import status: ${options.status}${options.dryRun ? ' (dry run)' : ''}`);
  console.log(
    `[info] Media import: ${
      options.importMedia
        ? `enabled (concurrency=${options.mediaConcurrency}, maxBytes=${options.mediaMaxBytes})`
        : 'disabled'
    }`
  );

  if (!hasAttribute(strapi, PRODUCT_UID, 'slug')) {
    throw new Error('Product.slug field is required for idempotent imports.');
  }

  for (const product of payload.products) {
    if (!product || !product.slug) {
      console.warn(`[warn] Skipping product without slug: ${JSON.stringify(product)}`);
      stats.skipped += 1;
      continue;
    }

    const category = await findCategory(strapi, categoryMatchField, product.categoryKey, options.status);

    if (!category) {
      console.warn(
        `[warn] Category not found for product "${product.slug}" using ${categoryMatchField}="${product.categoryKey}". Skipping product so imported products remain linked.`
      );
      stats.missingCategories += 1;
      stats.skipped += 1;
      continue;
    }

    const mediaFiles = await uploadProductImages(strapi, category, product, options, stats, folderCache);
    const data = buildProductData(strapi, product, category, mediaFiles, options, warned);
    const existing = await findExistingProduct(strapi, product.slug, options.status);

    if (options.dryRun) {
      console.log(`[dry-run] ${existing ? 'update' : 'create'} ${product.slug}`);
      continue;
    }

    if (existing) {
      await strapi.documents(PRODUCT_UID).update({
        documentId: existing.documentId,
        status: options.status,
        data,
      });
      stats.updated += 1;
      console.log(`[updated] ${product.slug}`);
      continue;
    }

    await strapi.documents(PRODUCT_UID).create({
      status: options.status,
      data,
    });
    stats.created += 1;
    console.log(`[created] ${product.slug}`);
  }

  return stats;
}

async function main() {
  const options = parseArgs(process.argv);
  const payload = readProductsFile(options.file);

  process.chdir(appDir);

  let app;

  try {
    const appContext = await compileStrapi({ appDir });
    app = await createStrapi(appContext).load();

    console.log(`[info] Reading products from ${options.file}`);
    console.log(`[info] Products in file: ${payload.products.length}`);

    const stats = await importProducts(app, payload, options);
    console.log(
      `[done] created=${stats.created} updated=${stats.updated} skipped=${stats.skipped} missingCategories=${stats.missingCategories} foldersQueued=${stats.foldersQueued} foldersCreated=${stats.foldersCreated} foldersReused=${stats.foldersReused} mediaQueued=${stats.mediaQueued} mediaUploaded=${stats.mediaUploaded} mediaReused=${stats.mediaReused} mediaMoved=${stats.mediaMoved} mediaRenamed=${stats.mediaRenamed} mediaFailed=${stats.mediaFailed}`
    );
  } finally {
    if (app) {
      await app.destroy();
    }
  }
}

main().catch((error) => {
  console.error('[error]', error.message);

  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }

  process.exit(1);
});
