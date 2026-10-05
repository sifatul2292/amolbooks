import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import { Product } from '../../../interfaces/common/product.interface';
import { SpecialPackage } from '../../../interfaces/common/special-package.interface';
import {
  AddSpecialPackageDto,
  AddSpecialPackageDraftDto,
  FilterAndPaginationSpecialPackageDto,
  OptionSpecialPackageDto,
  UpdateSpecialPackageDto,
} from '../../../dto/special-package.dto';
import { JobSchedulerService } from '../../../shared/job-scheduler/job-scheduler.service';
import {
  calculateEffectiveProductPrice,
  withCalculatedSpecialPackageSubtotal,
} from '../../../shared/utils/special-package-price.util';
import { DiscountTypeEnum } from '../../../enum/product.enum';
import { Response } from 'express';
import * as sharp from 'sharp';
import { basename, join } from 'path';

const ObjectId = Types.ObjectId;

@Injectable()
export class SpecialPackageService {
  private logger = new Logger(SpecialPackageService.name);

  constructor(
    @InjectModel('SpecialPackage')
    private readonly specialPackageModel: Model<SpecialPackage>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
    private jobSchedulerService: JobSchedulerService,
  ) {}

  private async getPackageImageDimensions(
    imageUrl?: string,
  ): Promise<{ width: number; height: number } | null> {
    if (!imageUrl) return null;

    try {
      const fileName = basename(decodeURIComponent(new URL(imageUrl).pathname));
      const imagePath = join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'upload',
        'images',
        fileName,
      );
      const metadata = await sharp(imagePath).metadata();
      return metadata.width && metadata.height
        ? { width: metadata.width, height: metadata.height }
        : null;
    } catch (_) {
      return null;
    }
  }

  async getSpecialPackageOgHtml(id: string, res: Response): Promise<void> {
    const sendError = (status: number, title: string) => {
      res.setHeader('Cache-Control', 'no-store');
      res.status(status).send(
        `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title} | Amolbooks</title></head><body><h1>${title}</h1></body></html>`,
      );
    };

    try {
      if (!ObjectId.isValid(id)) {
        sendError(404, 'প্যাকেজটি পাওয়া যায়নি');
        return;
      }

      const data: any = await this.specialPackageModel
        .findById(id)
        .populate('products.product', 'name slug images quantity')
        .select('name slug description image salePrice products updatedAt')
        .lean();

      if (!data) {
        sendError(404, 'প্যাকেজটি পাওয়া যায়নি');
        return;
      }

      const escapeHtml = (value: string) =>
        (value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      const normalizeMetaText = (value: string, maxLength = 160) => {
        const normalized = (value || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return normalized.length > maxLength
          ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
          : normalized;
      };

      const origin = 'https://www.amolbooks.com';
      const items = Array.isArray(data.products) ? data.products : [];
      const products = items.map((item: any) => item?.product).filter(Boolean);
      const productCount = products.length;
      const packageName = data.name || 'বিশেষ বইয়ের প্যাকেজ';
      const rawTitle = normalizeMetaText(
        `${packageName}${
          productCount ? ` — ${productCount}টি বইয়ের বিশেষ প্যাকেজ` : ''
        }`,
        110,
      );
      const price = Math.max(0, Number(data.salePrice || 0));
      const rawDescription = normalizeMetaText(
        data.description ||
          `${packageName}-এ${
            productCount
              ? ` ${productCount}টি নির্বাচিত ইসলামিক বই`
              : ' নির্বাচিত ইসলামিক বই'
          } একসাথে পান। অফার মূল্য ৳${price}। সারা বাংলাদেশে হোম ডেলিভারি।`,
      );
      const image =
        data.image ||
        products.find((product: any) => product?.images?.length)?.images?.[0] ||
        'https://www.amolbooks.com/assets/images/logo/logo.png';
      const dimensions = await this.getPackageImageDimensions(image);
      const imageType = /\.webp(?:$|\?)/i.test(image)
        ? 'image/webp'
        : /\.png(?:$|\?)/i.test(image)
          ? 'image/png'
          : 'image/jpeg';
      const canonicalUrl = `${origin}/special-package-details/${encodeURIComponent(
        String(data._id),
      )}`;
      const safeJsonLd = (value: any) =>
        JSON.stringify(value).replace(/</g, '\\u003c');
      const productJsonLd: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: packageName,
        description: rawDescription,
        image: [image],
        url: canonicalUrl,
        sku: String(data._id),
        category: 'Book bundle',
        brand: { '@type': 'Brand', name: 'Amolbooks' },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'BDT',
          price: price.toFixed(2),
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Amolbooks' },
        },
      };
      if (products.length) {
        productJsonLd.isRelatedTo = products.map((product: any) => ({
          '@type': 'Book',
          name: product.name,
          image: product.images?.[0],
          url: product.slug
            ? `${origin}/product-details/${encodeURIComponent(product.slug)}`
            : undefined,
        }));
      }
      const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'হোম',
            item: `${origin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'অফার',
            item: `${origin}/offers`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: packageName,
            item: canonicalUrl,
          },
        ],
      };

      const title = escapeHtml(rawTitle);
      const description = escapeHtml(rawDescription);
      const safeImage = escapeHtml(image);
      const safeUrl = escapeHtml(canonicalUrl);
      const imageAlt = escapeHtml(`${packageName} বিশেষ প্যাকেজ`);
      const imageSizeTags = dimensions
        ? `<meta property="og:image:width" content="${dimensions.width}">\n  <meta property="og:image:height" content="${dimensions.height}">`
        : '';
      const imageSizeAttributes = dimensions
        ? ` width="${dimensions.width}" height="${dimensions.height}"`
        : '';
      const productList = products.length
        ? `<ul>${products
            .map((product: any) => `<li>${escapeHtml(product.name || '')}</li>`)
            .join('')}</ul>`
        : '';

      const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${title} | Amolbooks</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="bn_BD">
  <meta property="og:site_name" content="Amolbooks">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="${imageType}">
  ${imageSizeTags}
  <meta property="og:image:alt" content="${imageAlt}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="BDT">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="twitter:image:alt" content="${imageAlt}">
  <link rel="canonical" href="${safeUrl}">
  <script type="application/ld+json">${safeJsonLd(productJsonLd)}</script>
  <script type="application/ld+json">${safeJsonLd(breadcrumbJsonLd)}</script>
</head>
<body>
  <main><article>
    <h1>${escapeHtml(packageName)}</h1>
    <img src="${safeImage}"${imageSizeAttributes} alt="${imageAlt}">
    <p>${description}</p>
    <p>প্যাকেজ মূল্য: ৳${price}</p>
    ${productList}
    <a href="${safeUrl}">Amolbooks থেকে প্যাকেজটি দেখুন ও অর্ডার করুন</a>
  </article></main>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).send(html);
    } catch (_) {
      sendError(500, 'প্যাকেজ তথ্য লোড করা যায়নি');
    }
  }

  async findAllForSitemap(): Promise<any[]> {
    return this.specialPackageModel
      .find({})
      .select('_id name image updatedAt')
      .lean();
  }

  /**
   * addSpecialPackage
   * insertManySpecialPackage
   */
  async addSpecialPackage(
    addSpecialPackageDto: AddSpecialPackageDto,
  ): Promise<ResponsePayload> {
    try {
      const { name } = addSpecialPackageDto;
      const { products } = addSpecialPackageDto;

      // Check Single Document
      const checkData = await this.specialPackageModel.findOne({ name: name });
      if (checkData) {
        return {
          success: false,
          message: 'Data Cannot be Added. Its a Single Document Collection',
          data: null,
        } as ResponsePayload;
      }

      // const defaultData = {
      //   slug: this.utilsService.transformToSlug(name),
      // };
      const mData = { ...addSpecialPackageDto };
      const newData = new this.specialPackageModel(mData);

      const saveData = await newData.save();
      /**
       * SCHEDULE DATE
       */

      return {
        success: true,
        message: 'Data Added Success',
        // data,
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  async createSpecialPackageDraft(
    draft: AddSpecialPackageDraftDto,
  ): Promise<ResponsePayload> {
    if (!draft.name.trim()) {
      throw new BadRequestException('Bundle name is required');
    }
    const productIds = draft.products.map((item) => item.product);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Each book can only appear once');
    }

    const products: any[] = await this.productModel
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .select('salePrice discountType discountAmount');
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more books no longer exist');
    }

    const productsById = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const regularPrice = draft.products.reduce(
      (total, item) =>
        total +
        calculateEffectiveProductPrice(productsById.get(item.product)) *
          item.quantity,
      0,
    );
    if (!regularPrice || draft.sellingPrice > regularPrice) {
      throw new BadRequestException(
        'Bundle price must not exceed the current discounted total',
      );
    }

    const existing = await this.specialPackageModel.findOne({
      name: draft.name.trim(),
    });
    if (existing)
      throw new ConflictException('A package with this name exists');

    const slugBase = this.utilsService.transformToSlug(draft.name) || 'bundle';
    const saved: any = await new this.specialPackageModel({
      name: draft.name.trim(),
      slug: `${slugBase}-${Date.now().toString(36)}`,
      salePrice: regularPrice,
      discountType: DiscountTypeEnum.CASH,
      discountAmount: regularPrice - draft.sellingPrice,
      active: false,
      products: draft.products.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        hasVariations: false,
      })),
    }).save();

    return {
      success: true,
      message: 'Bundle saved as an inactive draft',
      data: {
        _id: saved._id,
        name: saved.name,
        slug: saved.slug,
        active: saved.active,
        sellingPrice: draft.sellingPrice,
      },
    } as ResponsePayload;
  }

  async insertManySpecialPackage(
    addSpecialPackagesDto: AddSpecialPackageDto[],
    optionSpecialPackageDto: OptionSpecialPackageDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionSpecialPackageDto;
    if (deleteMany) {
      await this.specialPackageModel.deleteMany({});
    }
    const mData = addSpecialPackagesDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.specialPackageModel.insertMany(mData);
      return {
        success: true,
        message: `${
          saveData && saveData.length ? saveData.length : 0
        }  Data Added Success`,
      } as ResponsePayload;
    } catch (error) {
      // console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  /**
   * getAllSpecialPackages
   * getSpecialPackageById
   */
  async getAllSpecialPackages(
    filterSpecialPackageDto: FilterAndPaginationSpecialPackageDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterSpecialPackageDto;
    const { pagination } = filterSpecialPackageDto;
    const { sort } = filterSpecialPackageDto;
    const { select } = filterSpecialPackageDto;

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }
    if (searchQuery) {
      mFilter = { ...mFilter, ...{ name: new RegExp(searchQuery, 'i') } };
    }
    // Sort
    if (sort) {
      mSort = sort;
    } else {
      mSort = { createdAt: -1 };
    }

    // Select
    if (select) {
      mSelect = { ...select };
    } else {
      mSelect = { name: 1 };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateStages.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateStages.push({ $project: mSelect });
    }

    // Pagination
    if (pagination) {
      if (Object.keys(mSelect).length) {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
              { $project: mSelect },
            ],
          },
        };
      } else {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
            ],
          },
        };
      }

      aggregateStages.push(mPagination);

      aggregateStages.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.specialPackageModel.aggregate(
        aggregateStages,
      );
      if (pagination) {
        return {
          ...{ ...dataAggregates[0] },
          ...{ success: true, message: 'Success' },
        } as ResponsePayload;
      } else {
        return {
          data: dataAggregates,
          success: true,
          message: 'Success',
          count: dataAggregates.length,
        } as ResponsePayload;
      }
    } catch (err) {
      this.logger.error(err);
      if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
  async getSpecialPackageByIds(
    ids: any,
    select: string,
  ): Promise<ResponsePayload> {
    if (!ids?.ids || ids.ids.length === 0) {
      return { success: true, message: 'Success', data: [] } as ResponsePayload;
    }
    try {
      const mIds = ids.ids.map((m) => new ObjectId(m));
      // const data = await this.productModel.find({ _id: { $in: mIds } });
      const data: any[] = await this.specialPackageModel
        .find({ _id: { $in: mIds } })
        .populate(
          'products.product',
          'name nameEn editionEn translatorNameEn tagline taglineEn description totalPages currentVersion currentVersionEn translatorName publishedDate shortDescription author salePrice sku tax shortDesc discountType slug edition variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id',
        )
        .select(select);

      // Transform the products for each special package
      const transformedData = data.map((specialPackage) => {
        const transformedProducts = specialPackage.products.map((item) => {
          const transformedProduct = {
            ...item?.product?._doc,
            ...{
              quantity: item?.quantity,
              hasVariations: item?.hasVariations,
              selectedVariation: item?.selectedVariation,
            },
          };

          if (transformedProduct?.hasVariations) {
            let found = null;
            transformedProduct.variationsOptions.forEach((variationOption) => {
              if (
                String(variationOption?._id) ===
                String(transformedProduct?.selectedVariation)
              ) {
                found = variationOption;
              }
            });

            return found
              ? {
                  ...transformedProduct,
                  hasVariations: true,
                  selectedVariation: found,
                }
              : {
                  ...transformedProduct,
                  hasVariations: false,
                  selectedVariation: null,
                };
          } else {
            return transformedProduct;
          }
        });

        return withCalculatedSpecialPackageSubtotal({
          ...specialPackage?._doc,
          products: transformedProducts,
        });
      });

      // Return response
      return {
        success: true,
        message: 'Success',
        data: transformedData,
      } as ResponsePayload;
    } catch (err) {
      console.log('err', err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSpecialPackageById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      let data: any = await this.specialPackageModel
        .findById(id)
        .populate(
          'products.product',
          'name nameEn editionEn translatorNameEn tagline taglineEn description totalPages currentVersion currentVersionEn translatorName publishedDate shortDescription author  salePrice sku tax shortDesc discountType slug edition variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id',
        )
        .select(select);

      // console.warn(data)

      const newdata: any = await data.products.map((item) => {
        const transFrom = {
          ...item?.product?._doc,
          ...{
            quantity: item?.quantity,
            hasVariations: item?.hasVariations,
            selectedVariation: item?.selectedVariation,
          },
        };
        // console.warn(transFrom.selectedVariation)
        if (transFrom?.hasVariations) {
          let found = null;
          transFrom.variationsOptions.map((item) => {
            if (String(item?._id) == String(transFrom?.selectedVariation)) {
              found = item;
            }
          });
          if (!found) {
            return {
              ...transFrom,
              ...{ hasVariations: false, selectedVariation: null },
            };
            // Code for Delete variation
          } else {
            return {
              ...transFrom,
              ...{ hasVariations: true, selectedVariation: found },
            };
          }
        } else {
          return transFrom;
        }
      });
      data = withCalculatedSpecialPackageSubtotal({
        ...data?._doc,
        products: newdata,
      });
      // console.warn(data)
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      console.log('err', err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSpecialPackageBySlug(
    slug: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      let data: any = await this.specialPackageModel
        .findOne({ slug: slug })
        .populate(
          'products.product',
          'name description salePrice sku tax shortDesc discountType slug variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id',
        )
        .select(select);

      // console.warn(data)

      const newdata: any = await data.products.map((item) => {
        const transFrom = {
          ...item.product._doc,
          ...{
            quantity: item.quantity,
            hasVariations: item.hasVariations,
            selectedVariation: item.selectedVariation,
          },
        };
        // console.warn(transFrom.selectedVariation)
        if (transFrom.hasVariations) {
          let found = null;
          transFrom.variationsOptions.map((item) => {
            if (String(item._id) == String(transFrom.selectedVariation)) {
              found = item;
            }
          });
          if (!found) {
            return {
              ...transFrom,
              ...{ hasVariations: false, selectedVariation: null },
            };
            // Code for Delete variation
          } else {
            return {
              ...transFrom,
              ...{ hasVariations: true, selectedVariation: found },
            };
          }
        } else {
          return transFrom;
        }
      });
      data = withCalculatedSpecialPackageSubtotal({
        ...data._doc,
        products: newdata,
      });
      // console.warn(data)
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSpecialPackageSingle(select?: string): Promise<ResponsePayload> {
    try {
      const data = await this.specialPackageModel
        .findOne({})
        .populate('products.product')
        .select(select ? select : '');

      return {
        success: true,
        message: 'Success',
        data: withCalculatedSpecialPackageSubtotal(data),
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateSpecialPackageById
   * updateMultipleSpecialPackageById
   */
  async updateSpecialPackageById(
    id: string,
    updateSpecialPackageDto: UpdateSpecialPackageDto,
  ): Promise<ResponsePayload> {
    try {
      const { name } = updateSpecialPackageDto;
      const { products } = updateSpecialPackageDto;

      const data = await this.specialPackageModel.findById(id);

      const finalData = { ...updateSpecialPackageDto };
      // Check Slug
      // if (name) {
      //   if (name && data.name !== name) {
      //     finalData.slug = this.utilsService.transformToSlug(name, true);
      //   }
      // }
      await this.specialPackageModel.findByIdAndUpdate(id, {
        $set: finalData,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultipleSpecialPackageById(
    ids: string[],
    updateSpecialPackageDto: UpdateSpecialPackageDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateSpecialPackageDto.slug) {
      delete updateSpecialPackageDto.slug;
    }

    try {
      await this.specialPackageModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateSpecialPackageDto },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * deleteSpecialPackageById
   * deleteMultipleSpecialPackageById
   */
  async deleteSpecialPackageById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.specialPackageModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    if (data.readOnly) {
      throw new NotFoundException('Sorry! Read only data can not be deleted');
    }
    try {
      const defaultSpecialPackage = await this.specialPackageModel.findOne({
        _id: id,
      });

      await this.specialPackageModel.findByIdAndDelete(id);

      const productIds = defaultSpecialPackage
        ? defaultSpecialPackage.products.map((m) => new ObjectId(m))
        : [];

      let resetData = {
        discountStartDateTime: null,
        discountEndDateTime: null,
      };

      if (checkUsage) {
        resetData = {
          ...resetData,
          ...{
            discountType: null,
            discountAmount: null,
          },
        };
      }
      // Update Product
      await this.productModel.updateMany(
        { _id: { $in: productIds } },
        { $set: resetData },
      );
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleSpecialPackageById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.specialPackageModel.find({
        _id: { $in: mIds },
      });

      await this.specialPackageModel.deleteMany({ _id: mIds });
      // Reset Product SpecialPackage Reference
      const mProductsIds = [];

      allCategory.forEach((f) => {
        f.products.forEach((g) => {
          mProductsIds.push(g);
        });
      });
      const productIds = mProductsIds.map((m) => new ObjectId(m));

      let resetData = {
        discountStartDateTime: null,
        discountEndDateTime: null,
      };

      if (checkUsage) {
        resetData = {
          ...resetData,
          ...{
            discountType: null,
            discountAmount: null,
          },
        };
      }
      // Update Product
      await this.productModel.updateMany(
        { _id: { $in: productIds } },
        { $set: resetData },
      );
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
