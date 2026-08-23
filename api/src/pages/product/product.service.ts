import {
  BadRequestException,
  CACHE_MANAGER,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { Product } from '../../interfaces/common/product.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddProductDto,
  FilterAndPaginationProductDto,
  GetProductByIdsDto,
  OptionProductDto,
  UpdateProductDto,
} from '../../dto/product.dto';
import { Cache } from 'cache-manager';
import { Category } from '../../interfaces/common/category.interface';
import { Brand } from '../../interfaces/common/brand.interface';
import { Publisher } from '../../interfaces/common/publisher.interface';
import { ShopInformation } from '../../interfaces/common/shop-information.interface';
import { RedirectUrl } from '../../interfaces/common/redirect-url.interface';
import { FbCatalogService } from '../../shared/fb-catalog/fb-catalog.service';
import { Setting } from '../customization/setting/interface/setting.interface';
import { StockMovement } from '../../interfaces/common/stock-movement.interface';
import { StockPurchase } from '../../interfaces/common/stock-purchase.interface';
import { CreateStockPurchaseDto, GetStockMovementsDto } from '../../dto/stock.dto';
import { Order } from '../../interfaces/common/order.interface';
import { OrderStatus } from '../../enum/order.enum';
import * as moment from 'moment-timezone';
const ObjectId = Types.ObjectId;

@Injectable()
export class ProductService {
  private logger = new Logger(ProductService.name);
  private readonly cacheProductPage = 'getAllProducts?page=1';
  private readonly cacheProductCount = 'getAllProducts?count';

  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('Category') private readonly categoryModel: Model<Category>,
    @InjectModel('Brand') private readonly brandModel: Model<Brand>,
    @InjectModel('Publisher') private readonly publisherModel: Model<Publisher>,
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('RedirectUrl')
    private readonly redirectUrlModel: Model<RedirectUrl>,
    @InjectModel('ShopInformation')
    private readonly shopInformationModel: Model<ShopInformation>,
    @InjectModel('BoughtTogetherConfig') private readonly boughtTogetherConfigModel: Model<any>,
    @InjectModel('StockMovement')
    private readonly stockMovementModel: Model<StockMovement>,
    @InjectModel('StockPurchase')
    private readonly stockPurchaseModel: Model<StockPurchase>,
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    private configService: ConfigService,
    private utilsService: UtilsService,
    private fbCatalogService: FbCatalogService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private normalizeProductImageUrl(image?: string): string | undefined {
    if (!image || typeof image !== 'string') {
      return image;
    }

    const trimmedImage = image.trim();
    if (!trimmedImage) {
      return trimmedImage;
    }

    return trimmedImage;
  }

  private normalizeProductImageFields<T>(data: T): T {
    if (!data) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.normalizeProductImageFields(item)) as T;
    }

    if (typeof data !== 'object') {
      return data;
    }

    const product = data as any;

    if (Array.isArray(product.images)) {
      product.images = product.images.map((image: string) =>
        this.normalizeProductImageUrl(image),
      );
    }

    if (!product.image && product.images && product.images.length) {
      product.image = product.images[0];
    } else if (product.image) {
      product.image = this.normalizeProductImageUrl(product.image);
    }

    return product;
  }

  /**
   * addProduct
   * insertManyProduct
   */
  async addProduct(addProductDto: AddProductDto): Promise<ResponsePayload> {
    const { nameEn, name, quantity } = addProductDto;

    // const slug = this.utilsService.transformToSlug(nameEn || name, true);

    // ✅ 1. Check duplicate by nameEn or name
    const existingProduct = await this.productModel.findOne({
      $or: [{ nameEn: nameEn?.trim() }, { name: name?.trim() }],
    });

    if (existingProduct) {
      throw new ConflictException(
        'Product with same name or nameEn already exists',
      );
    }

    const defaultData = {
      quantity: quantity ? quantity : 0,
    };

    const mData = { ...addProductDto, ...defaultData };
    const newData = new this.productModel(mData);

    try {
      const saveData = await newData.save();
      const data = { _id: saveData._id };

      // ✅ Facebook Catalog Sync (if enabled)
      const fSetting = await this.settingModel
        .findOne({})
        .select('facebookCatalog');

      if (fSetting?.facebookCatalog?.isEnableFacebookCatalog) {
        this.productUpdateOnFbCatalog();
      }

      // console.log(fSetting);
      // console.log('fSetting.facebookCatalog', fSetting.facebookCatalog);
      // console.log(
      //   'fSetting.facebookCatalog?.isEnableFacebookCatalog',
      //   fSetting.facebookCatalog?.isEnableFacebookCatalog,
      // );

      // ✅ Remove cache
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: 'Product added successfully',
        data,
      } as ResponsePayload;
    } catch (error) {
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug must be unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  private async productUpdateOnFbCatalog() {
    const data = JSON.parse(
      JSON.stringify(
        await this.productModel.find({
          isFacebookCatalog: true,
          status: 'publish',
        }),
      ),
    );

    // Adjust Variation with Dynamic Variation Name
    function transformVariationProduct(product: any) {
      return {
        id: product._id,
        item_group_id: product._id,
        title: product.name,
        price: `${product.salePrice} BDT`,
        sale_price: `${product.salePrice} BDT`,
        description: 'Your product description will be here',
        availability: product?.quantity > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        link: `https://alambook.com/product-details/${product.slug}`,
        image_link:
          product.images && product.images.length
            ? product.images[0]
            : 'https://cdn.saleecom.com/upload/images/placeholder.png',
        brand: product.brand?.name ?? 'unknown',
        variations: product.variationList.map((variation: any) => {
          const variationObj = {
            id: variation._id,
            item_group_id: product._id,
            title: product.name,
            description: 'Your product description will be here',
            availability: product?.quantity > 0 ? 'in stock' : 'out of stock',
            condition: 'new',
            sku: variation.sku ?? variation._id,
            price: `${variation.regularPrice} BDT`,
            sale_price: `${variation.salePrice} BDT`,
            link: `https://alambook.com/product-details/${product.slug}`,
            image_link:
              variation.image ??
              (product.images && product.images.length
                ? product.images[0]
                : 'https://cdn.saleecom.com/upload/images/placeholder.png'),
            brand: product.brand?.name ?? 'unknown',
            fb_product_category: product.category?.name ?? null,
          };

          // Assign variations dynamically
          if (product.variation) {
            const [key, value] = [
              product.variation.toLowerCase(),
              variation.name.split(',')[0],
            ];
            variationObj[key] = value;
          }
          if (product.variation2 && variation.name.includes(',')) {
            const [_, value] = variation.name.split(',');
            const key = product.variation2.toLowerCase();
            variationObj[key] = value;
          }

          return variationObj;
        }),
      };
    }

    // Modify Product Data
    const mProductData = data.map((m) => {
      if (m.isVariation) {
        return transformVariationProduct(m);
      } else {
        return {
          id: m._id,
          item_group_id: m._id,
          title: m.name,
          description: 'Your product description will be here',
          availability: m?.quantity > 0 ? 'in stock' : 'out of stock',
          condition: 'new',
          price: `${m.salePrice} BDT`,
          sale_price: `${m.salePrice} BDT`,
          link: `https://alambook.com/product-details/${m.slug}`,
          image_link:
            m.images && m.images.length
              ? m.images[0]
              : 'https://cdn.saleecom.com/upload/images/placeholder.png',
          additional_image_link:
            m.images && m.images.length > 1 ? m.images.slice(1) : [],
          brand: m.brand?.name ?? 'unknown',
          fb_product_category: m.category?.name ?? null,
        };
      }
    });

    // Make Structure for FB Pixel Format
    const formattedProducts = [];

    for (const product of mProductData) {
      if (product.variations && product.variations.length > 0) {
        // Handle Variants
        for (const variant of product.variations) {
          formattedProducts.push(variant);
        }
      } else {
        // Handle Standalone Product (No Variants)
        formattedProducts.push(product);
      }
    }

    // Make Structure for CSV
    function normalizeForCsv<T extends Record<string, any>>(
      jsonData: T[],
    ): T[] {
      // Extract all possible keys dynamically (excluding 'id' and 'title')
      const allKeys = new Set<string>();

      jsonData.forEach((product) => {
        Object.keys(product).forEach((key) => {
          if (key !== 'id' && key !== 'title') {
            allKeys.add(key);
          }
        });
      });

      // Convert Set to an array
      const extraFields = Array.from(allKeys);

      // Normalize each object by ensuring all keys exist with default values
      return jsonData.map((product) => {
        const normalizedProduct: Record<string, any> = {
          id: product.id,
          title: product.title,
        };

        // Assign default empty values for unknown fields
        extraFields.forEach((field) => {
          normalizedProduct[field] = product[field] ?? '';
        });

        return normalizedProduct as T;
      });
    }

    const finalData = normalizeForCsv(formattedProducts);
    await this.fbCatalogService.addFbCatalogProduct(finalData);
  }

  async cloneSingleProduct(id: string): Promise<ResponsePayload> {
    try {
      const data = await this.productModel.findById(id);
      const jData = JSON.stringify(data);
      const product = JSON.parse(jData);

      product.name = `${product.name}(Clone-${this.utilsService.getRandomInt(
        0,
        100,
      )})`;
      product.slug = this.utilsService.transformToSlug(product.name, true);
      product.sku = `${product.sku}-${this.utilsService.getRandomInt(0, 100)}`;
      product.quantity = 0;
      delete product._id;
      delete product.createdAt;
      delete product.updatedAt;

      const newData = new this.productModel(product);
      const saveData = await newData.save();

      const response = {
        _id: saveData._id,
      };

      // Cache Removed
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: 'Data Clone Success',
        data: response,
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      // console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  async insertManyProduct(
    addProductsDto: AddProductDto[],
    optionProductDto: OptionProductDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionProductDto;
    if (deleteMany) {
      await this.productModel.deleteMany({});
    }
    const mData = addProductsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.productModel.insertMany(mData);

      // Cache Removed
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: `${
          saveData && saveData.length ? saveData.length : 0
        }  Data Added Success`,
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

  async getAllProductForUi(payload: any): Promise<ResponsePayload> {
    try {
      const { status, page, limit } = payload;

      const tagName = payload['tags.name'];
      const mFilter: any = {};

      if (status) {
        mFilter.status = status;
      }

      if (tagName) {
        mFilter['tags.name'] = tagName;
      }

      const sortQuery: any = { createdAt: -1 };

      const skip = (Number(page) - 1) * Number(limit);

      const [data, totalCount] = await Promise.all([
        this.productModel
          .find(mFilter)
          .select(
            'name nameEn seoKeyword seoTitle seoDescription author discountType slug discountAmount tags quantity regularPrice salePrice ratingTotal images ratingCount',
          )
          .skip(Number(skip))
          .limit(Number(limit))
          .sort(sortQuery)
          .lean(),
        this.productModel.countDocuments(mFilter),
      ]);

      return {
        success: true,
        message: 'Success! Data fetch successfully.',
        data: this.normalizeProductImageFields(data),
        count: totalCount,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * getAllProducts
   * getProductById
   */
  async getAllProducts(
    filterProductDto: FilterAndPaginationProductDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterProductDto;
    const { pagination } = filterProductDto;
    const { sort } = filterProductDto;
    const { select } = filterProductDto;
    const { filterGroup } = filterProductDto;
    // if (
    //   pagination.currentPage < 1 &&
    //   filter == null &&
    //   JSON.stringify(sort) == JSON.stringify({ createdAt: -1 })
    // ) {
    //   const cache: object[] = await this.cacheManager.get(
    //     this.cacheProductPage,
    //   );
    //   const count: number = await this.cacheManager.get(this.cacheProductCount);
    //   if (cache) {
    //     this.logger.log('Cached page');
    //     return {
    //       data: cache,
    //       success: true,
    //       message: 'Success',
    //       count: count,
    //     } as ResponsePayload;
    //   }
    // }

    // Modify Id as Object ID
    if (
      filter &&
      filter['category._id'] &&
      Array.isArray(filter['category._id']['$in'])
    ) {
      filter['category._id']['$in'] = filter['category._id']['$in']
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
    } else {
      if (filter && filter['category._id']) {
        filter['category._id'] = new ObjectId(filter['category._id']);
      }
    }

    if (filter && filter['subCategory._id']) {
      filter['subCategory._id'] = new ObjectId(filter['subCategory._id']);
    }

    if (filter && filter['brand._id']) {
      filter['brand._id'] = new ObjectId(filter['brand._id']);
    }
    if (filter && filter['publisher._id']) {
      filter['publisher._id'] = new ObjectId(filter['publisher._id']);
    }

    if (filter && filter['tags._id']) {
      filter['tags._id'] = new ObjectId(filter['tags._id']);
    }

    if (filter && filter['author._id']) {
      filter['author._id'] = new ObjectId(filter['author._id']);
    }

    if (filter && filter['createdAt']) {
      filter['createdAt']['$gte'] = new Date(filter['createdAt']['$gte']);
      filter['createdAt']['$lte'] = new Date(filter['createdAt']['$lte']);
    }

    // Aggregate Stages
    const aggregateStages = [];
    const aggregateCategoryGroupStages = [];
    const aggregateBrandGroupStages = [];
    const aggregatePublisherGroupStages = [];
    const aggregateSubCategoryGroupStages = [];

    // Essential Variables
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }

    // if (searchQuery) {
    //   mFilter = {
    //     $and: [
    //       mFilter,
    //       {
    //         $or: [
    //           {
    //             // name: new RegExp(
    //             //   this.utilsService.transformRegexString(searchQuery),
    //             //   'i',
    //             // ),
    //             name: this.utilsService.createRegexFromString(searchQuery),
    //
    //           },
    //           // { slug: new RegExp(searchQuery, 'i') },
    //           // { 'category.slug': new RegExp(searchQuery, 'i') },
    //           // { 'category.name': new RegExp(searchQuery, 'i') },
    //         ],
    //       },
    //     ],
    //   };
    //   // mFilter = { ...mFilter, ...{ name: new RegExp(searchQuery, 'i') } };
    // }
    if (searchQuery) {
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { name: this.utilsService.createRegexFromString1(searchQuery) },
              { nameEn: this.utilsService.createRegexFromString1(searchQuery) },
              {
                seoKeywords:
                  this.utilsService.createRegexFromString1(searchQuery),
              },
              {
                translatorName:
                  this.utilsService.createRegexFromString1(searchQuery),
              },
              {
                'category.name':
                  this.utilsService.createRegexFromString1(searchQuery),
              },
              {
                'publisher.name':
                  this.utilsService.createRegexFromString1(searchQuery),
              },
              {
                'author.name':
                  this.utilsService.createRegexFromString1(searchQuery),
              },
            ],
          },
        ],
      };
      // mFilter = { ...mFilter, ...{ name: new RegExp(searchQuery, 'i') } };
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

    if (mSelect['image']) {
      mSelect['image'] = {
        $ifNull: ['$image', { $arrayElemAt: ['$images', 0] }],
      };
    }

    // GROUPING FOR FILTER PRODUCTS
    let groupCategory;
    let groupBrand;
    let groupSubCategory;
    let groupPublisher;

    if (filterGroup && filterGroup.isGroup) {
      if (filterGroup.category) {
        groupCategory = {
          $group: {
            _id: { category: '$category._id' },
            name: { $first: '$category.name' },
            slug: { $first: '$category.slug' },
            total: { $sum: 1 },
          },
        };
      }

      if (filterGroup.brand) {
        groupBrand = {
          $group: {
            _id: { brand: '$brand._id' },
            name: { $first: '$brand.name' },
            slug: { $first: '$brand.slug' },
            total: { $sum: 1 },
          },
        };
      }

      if (filterGroup.subCategory) {
        groupSubCategory = {
          $group: {
            _id: { subCategory: '$subCategory._id' },
            name: { $first: '$subCategory.name' },
            slug: { $first: '$subCategory.slug' },
            total: { $sum: 1 },
          },
        };
      }

      if (filterGroup.publisher) {
        groupPublisher = {
          $group: {
            _id: { publisher: '$publisher._id' },
            name: { $first: '$publisher.name' },
            slug: { $first: '$publisher.slug' },
            total: { $sum: 1 },
          },
        };
      }
    }

    // Finalize — $match must be FIRST so sort/paginate operate on filtered set
    if (Object.keys(mFilter).length) {
      // Main
      aggregateStages.unshift({ $match: mFilter });

      // Category Groups
      if (groupCategory) {
        // aggregateCategoryGroupStages.push({ $match: mFilter });
        aggregateCategoryGroupStages.push(groupCategory);
      }

      // Sub Category Groups
      if (groupSubCategory) {
        // aggregateSubCategoryGroupStages.push({ $match: mFilter });
        aggregateSubCategoryGroupStages.push(groupSubCategory);
      }

      // Brand Groups
      if (groupBrand) {
        // aggregateBrandGroupStages.push({ $match: mFilter });
        aggregateBrandGroupStages.push(groupBrand);
      }
      // Publisher Groups
      if (groupPublisher) {
        // aggregatePublisherGroupStages.push({ $match: mFilter });
        aggregatePublisherGroupStages.push(groupPublisher);
      }
    } else {
      if (groupCategory) {
        aggregateCategoryGroupStages.push(groupCategory);
      }
      if (groupSubCategory) {
        aggregateSubCategoryGroupStages.push(groupSubCategory);
      }
      if (groupBrand) {
        aggregateBrandGroupStages.push(groupBrand);
      }
      if (groupPublisher) {
        aggregatePublisherGroupStages.push(groupPublisher);
      }
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
      // Main
      const dataAggregates = await this.productModel.aggregate(aggregateStages);

      // GROUP FILTER PRODUCTS DATA
      let categoryAggregates;
      let subCategoryAggregates;
      let brandAggregates;
      let publisherAggregates;
      // Category
      if (filterGroup && filterGroup.isGroup && filterGroup.category) {
        categoryAggregates = await this.productModel.aggregate(
          aggregateCategoryGroupStages,
        );
      }

      // Sub Category
      if (filterGroup && filterGroup.isGroup && filterGroup.subCategory) {
        subCategoryAggregates = await this.productModel.aggregate(
          aggregateSubCategoryGroupStages,
        );
      }

      // Brand
      if (filterGroup && filterGroup.isGroup && filterGroup.brand) {
        brandAggregates = await this.productModel.aggregate(
          aggregateBrandGroupStages,
        );
      }

      // Publisher
      if (filterGroup && filterGroup.isGroup && filterGroup.publisher) {
        publisherAggregates = await this.productModel.aggregate(
          aggregatePublisherGroupStages,
        );
      }

      // Main Filter Data
      let allFilterGroups;
      if (filterGroup && filterGroup.isGroup) {
        allFilterGroups = {
          categories:
            categoryAggregates && categoryAggregates.length
              ? categoryAggregates
              : [],
          subCategories:
            subCategoryAggregates && subCategoryAggregates.length
              ? subCategoryAggregates
              : [],
          brands:
            brandAggregates && brandAggregates.length ? brandAggregates : [],
          publishers:
            publisherAggregates && publisherAggregates.length
              ? publisherAggregates
              : [],
        };
      } else {
        allFilterGroups = null;
      }

      if (pagination) {
        if (
          pagination.currentPage < 1 &&
          filter == null &&
          JSON.stringify(sort) == JSON.stringify({ createdAt: -1 })
        ) {
          await this.cacheManager.set(
            this.cacheProductPage,
            dataAggregates[0].data,
          );
          await this.cacheManager.set(
            this.cacheProductCount,
            dataAggregates[0].count,
          );
          this.logger.log('Cache Added');
        }

        return {
          ...{
            ...dataAggregates[0],
            data: this.normalizeProductImageFields(dataAggregates[0].data),
          },
          ...{
            success: true,
            message: 'Success',
            filterGroup: allFilterGroups,
          },
        } as ResponsePayload;
      } else {
        return {
          data: this.normalizeProductImageFields(dataAggregates),
          success: true,
          message: 'Success',
          count: dataAggregates.length,
          filterGroup: allFilterGroups,
        } as ResponsePayload;
      }
    } catch (err) {
      // console.log('errr>>>>', err);
      this.logger.error(err);
      if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async getProductById(id: string, select: string): Promise<ResponsePayload> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    try {
      const data = await this.productModel
        .findById(id)
        .select(select)
        .populate('tags');

      return {
        success: true,
        message: 'Success',
        data: this.normalizeProductImageFields(
          data && (data as any).toObject ? (data as any).toObject() : data,
        ),
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async updateSpecificProduct(
    productId: string,
  ): Promise<{ updated: boolean }> {
    // Define the specific updates
    const updates = {
      ratingCount: 5, // New value for ratingCount
      ratingTotal: 1, // New value for ratingTotal
      reviewTotal: 1, // New value for reviewTotal
    };
    // Update the product by ID
    const result = await this.productModel.findByIdAndUpdate(
      productId,
      updates,
    );

    // Check if the product was found and updated
    if (!result) {
      throw new Error(`Product with ID ${productId} not found or not updated`);
    }

    return { updated: true };
  }

  async getProductBySlug(
    slug: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      // let data;
      let productById;
      // console.log('slug', slug);
      const data = await this.productModel
        .findOne({ slug: slug })
        .select(select)
        .populate('tags');

      // Check if the slug is a valid MongoDB ObjectId
      // if (Types.ObjectId.isValid(slug)) {
      //   // If it's an ObjectId, search by _id
      //   productById = await this.productModel
      //     .findById(slug)
      //     .select(select)
      //     .populate('tags');
      // } else {
      //   // Otherwise, search by slug
      //   data = await this.productModel
      //     .findOne({ slug: slug })
      //     .select(select)
      //     .populate('tags');
      // }
      // let fShopInfo;
      // if (!productById && !data) {
      //   // const url = `https://www.alambook.com/product-details/${slug}`;
      //   fShopInfo = await this.redirectUrlModel.findOne({
      //     fromUrl: slug,
      //   });
      // }
      // // console.log('fShopInfo',slug);
      // // console.log('fShopInfo',fShopInfo);
      // // Check if the found product needs redirection
      // if (productById) {
      //   return {
      //     success: false,
      //     message: 'Redirect',
      //     redirectTo: `/product-details/${productById?.slug}`,
      //   };
      // }

      // if (!data && !productById) {
      //   if (fShopInfo?.toUrl) {
      //     return {
      //       success: false,
      //       message: 'Redirect',
      //       redirectTo: fShopInfo?.toUrl,
      //     };
      //   } else {
      //     return {
      //       success: false,
      //       message: 'Redirect',
      //       redirectTo: `**`,
      //     };
      //   }
      // }

      if (!data) {
        const allRedirects = await this.redirectUrlModel.find({}).lean();
        let redirectTo: string | null = null;
        for (const redirect of allRedirects) {
          if (!redirect.fromUrl) continue;
          const hasWildcard = redirect.fromUrl.endsWith('*');
          const cleanFrom = redirect.fromUrl.replace(/\*$/, '');
          const fromPath = cleanFrom.replace(/^https?:\/\/[^/]+/, '');
          const segments = fromPath.split('/').filter(Boolean);
          const fromSlug = segments[segments.length - 1];
          if (!fromSlug) continue;
          if (hasWildcard ? slug.startsWith(fromSlug) : slug === fromSlug) {
            redirectTo = redirect.toUrl;
            break;
          }
        }
        if (redirectTo) {
          return { success: false, message: 'Redirect', redirectTo } as ResponsePayload;
        }
        return { success: false, message: 'Product not found', data: null } as ResponsePayload;
      }
      // Helper: compute the after-discount price server-side so the frontend
      // never needs to touch enum comparisons or discountType logic.
      const calcAfterDiscount = (p: any): number => {
        const sp = Number(p?.salePrice || 0);
        const da = Number(p?.discountAmount || 0);
        const dt = Number(p?.discountType || 0);
        if (!dt || da <= 0) return sp;
        if (dt === 1) return Math.max(Math.floor(sp - sp * da / 100), 0); // PERCENTAGE
        if (dt === 2) return Math.max(Math.floor(sp - da), 0);            // CASH
        return sp;
      };
      const toBtItem = (p: any) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        images: p.images,
        salePrice: p.salePrice,
        discountAmount: p.discountAmount,
        discountType: p.discountType,
        afterDiscountPrice: calcAfterDiscount(p),
      });

      const BT_SELECT = '_id name slug images salePrice discountAmount discountType';
      let boughtTogetherProducts: any[] = [];
      const productIds = (data as any).boughtTogetherIds as string[];
      if (productIds && productIds.length > 0) {
        const selfRaw = (data as any).toObject ? (data as any).toObject() : (data as any);
        const selfId = selfRaw._id.toString();
        const mIds = productIds.slice(0, 2)
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
        let perItems: any[] = await this.productModel
          .find({ _id: { $in: mIds } })
          .select(BT_SELECT)
          .limit(2);
        if (perItems.length < 2) {
          const slotsLeft = 2 - perItems.length;
          const usedIds = new Set([selfId, ...perItems.map((p: any) => p._id.toString())]);
          const globalConfig = await this.boughtTogetherConfigModel.findOne();
          if (globalConfig?.productIds?.length > 0) {
            const fillIds = globalConfig.productIds
              .filter((id: string) => ObjectId.isValid(id) && !usedIds.has(id))
              .slice(0, slotsLeft)
              .map((id: string) => new ObjectId(id));
            if (fillIds.length > 0) {
              const fillItems = await this.productModel.find({ _id: { $in: fillIds } }).select(BT_SELECT);
              perItems = [...perItems, ...fillItems];
            }
          }
        }
        boughtTogetherProducts = [toBtItem(selfRaw), ...perItems.slice(0, 2).map((p: any) => toBtItem(p.toObject ? p.toObject() : p))];
      } else {
        const globalConfig = await this.boughtTogetherConfigModel.findOne();
        if (globalConfig?.productIds?.length > 0) {
          const selfRaw2 = (data as any).toObject ? (data as any).toObject() : (data as any);
          const selfId2 = selfRaw2._id.toString();
          const mIds = globalConfig.productIds
            .filter((id: string) => ObjectId.isValid(id) && id !== selfId2)
            .slice(0, 2)
            .map((id: string) => new ObjectId(id));
          const others = await this.productModel.find({ _id: { $in: mIds } }).select(BT_SELECT).limit(2);
          boughtTogetherProducts = [toBtItem(selfRaw2), ...others.map((p: any) => toBtItem(p.toObject ? p.toObject() : p))];
        }
      }
      const responseData = { ...(data as any).toObject(), boughtTogetherProducts };
      return { success: true, message: 'Success', data: responseData } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getProductOgHtml(slug: string, res: any): Promise<void> {
    try {
      const data = await this.productModel
        .findOne({ slug })
        .select('name slug images salePrice seoTitle seoDescription seoKeywords');

      const escapeHtml = (str: string) =>
        (str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');

      const normalizeMetaText = (value: string, maxLength = 300) => {
        const normalized = (value || '').replace(/\s+/g, ' ').trim();
        return normalized.length > maxLength
          ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
          : normalized;
      };

      const shopName = 'Amolbooks';
      const title = data
        ? escapeHtml(
            normalizeMetaText(
              (data as any).seoTitle || (data as any).name || shopName,
              120,
            ),
          )
        : shopName;
      const description = data
        ? escapeHtml(
            normalizeMetaText(
              (data as any).seoDescription ||
                `${(data as any).name || ''} — ${shopName}`,
            ),
          )
        : shopName;
      const keywords = data ? escapeHtml((data as any).seoKeywords || '') : '';
      const images = data ? (data as any).images : null;
      const rawImage = images && images.length ? images[0] : '';
      const image = rawImage
        ? rawImage
        : 'https://www.amolbooks.com/assets/images/logo/logo.png';
      const productSlug = data ? (data as any).slug : slug;
      const url = `https://www.amolbooks.com/product-details/${productSlug}`;
      const price = data && (data as any).salePrice ? `${(data as any).salePrice}` : '';

      const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${title} | ${shopName}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${shopName}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(url)}">
  ${price ? `<meta property="product:price:amount" content="${escapeHtml(price)}">` : ''}
  ${price ? `<meta property="product:price:currency" content="BDT">` : ''}
  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(url)}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${escapeHtml(url)}">View Product</a>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).send(html);
    } catch (err) {
      res.status(500).send('<html><body><h1>Error</h1></body></html>');
    }
  }

  async getBoughtTogetherProducts(productSlug?: string): Promise<ResponsePayload> {
    try {
      const BT_SELECT = '_id name slug images salePrice discountAmount discountType discountPercent costPrice quantity weight ratingAverage ratingCount';
      const config = await this.boughtTogetherConfigModel.findOne({});
      const globalIds: string[] = config?.productIds ?? [];

      let finalIds: string[] = [];

      if (productSlug) {
        const productDoc = await this.productModel.findOne({ slug: productSlug }).select('boughtTogetherIds _id');
        const perProductIds: string[] = (productDoc as any)?.boughtTogetherIds ?? [];
        const currentId: string | undefined = (productDoc as any)?._id?.toString();
        if (perProductIds.length > 0) {
          // Per-product selections excluding the current product (up to 3)
          const perPart = perProductIds.filter((id) => id !== currentId).slice(0, 3);
          const slotsLeft = 3 - perPart.length;
          const globalFill = slotsLeft > 0
            ? globalIds.filter((id) => !perProductIds.includes(id) && id !== currentId).slice(0, slotsLeft)
            : [];
          finalIds = [...perPart, ...globalFill];
        } else if (currentId) {
          // No per-product config — fill from global, excluding current product
          finalIds = globalIds.filter((id) => id !== currentId).slice(0, 3);
        }
      }

      if (!finalIds.length) {
        finalIds = globalIds.slice(0, 3);
      }

      if (!finalIds.length) {
        return { success: true, message: 'No bought-together configured', data: { productIds: [], products: [] } } as ResponsePayload;
      }

      const mIds = finalIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const rawProducts = await this.productModel.find({ _id: { $in: mIds } }).select(BT_SELECT);
      // Sort by finalIds order so current product is always first
      const productMap = new Map(rawProducts.map((p: any) => [p._id.toString(), p]));
      const products = finalIds.map((id) => productMap.get(id)).filter(Boolean);
      return { success: true, message: 'Success', data: { productIds: finalIds, products } } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async setBoughtTogetherProducts(productIds: string[]): Promise<ResponsePayload> {
    try {
      const clean = [...new Set(productIds)].filter((id) => ObjectId.isValid(id)).slice(0, 3);
      const existing = await this.boughtTogetherConfigModel.findOne({});
      if (existing) {
        await this.boughtTogetherConfigModel.findByIdAndUpdate(existing._id, { $set: { productIds: clean } });
      } else {
        await this.boughtTogetherConfigModel.create({ productIds: clean });
      }
      return { success: true, message: 'Bought together updated successfully' } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getBoughtTogetherByProduct(productId: string): Promise<ResponsePayload> {
    try {
      const BT_SELECT = '_id name slug images salePrice discountAmount discountType discountPercent costPrice quantity weight ratingAverage ratingCount';
      const product = await this.productModel.findById(productId).select('boughtTogetherIds');
      const perProductIds: string[] = (product as any)?.boughtTogetherIds ?? [];
      if (perProductIds.length > 0) {
        const mIds = perProductIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
        const products = await this.productModel.find({ _id: { $in: mIds, $ne: new ObjectId(productId) } }).select(BT_SELECT);
        return { success: true, message: 'Success', data: { source: 'product', productIds: perProductIds, products } } as ResponsePayload;
      }
      const config = await this.boughtTogetherConfigModel.findOne({});
      const globalIds: string[] = config?.productIds ?? [];
      if (!globalIds.length) {
        return { success: true, message: 'No bought-together configured', data: { source: 'global', productIds: [], products: [] } } as ResponsePayload;
      }
      const mGlobalIds = globalIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const products = await this.productModel.find({ _id: { $in: mGlobalIds, $ne: new ObjectId(productId) } }).select(BT_SELECT);
      return { success: true, message: 'Success', data: { source: 'global', productIds: globalIds, products } } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getProductByIds(
    getProductByIdsDto: GetProductByIdsDto,
    select: string,
  ): Promise<ResponsePayload> {
    if (!getProductByIdsDto.ids || getProductByIdsDto.ids.length === 0) {
      return { success: true, message: 'Success', data: [] } as ResponsePayload;
    }
    try {
      const mIds = getProductByIdsDto.ids.map((m) => new ObjectId(m));
      const data = await this.productModel.find({ _id: { $in: mIds } });
      // .select(select ? select : '');
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateProductById
   * updateMultipleProductById
   */
  async updateProductById(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ResponsePayload> {
    const { nameEn } = updateProductDto;
    let data;
    try {
      data = await this.productModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateProductDto };
      // Check Slug
      if (nameEn)
        if (nameEn && data.nameEn !== nameEn) {
          finalData.slug = this.utilsService.transformToSlug(nameEn, true);
          finalData.quantity = finalData.quantity ? finalData.quantity : 0;
        }

      await this.productModel.findByIdAndUpdate(id, {
        $set: finalData,
      });

      // Setting Data
      const fSetting = await this.settingModel
        .findOne()
        .select('facebookCatalog');

      if (
        fSetting.facebookCatalog &&
        fSetting.facebookCatalog?.isEnableFacebookCatalog
      ) {
        this.productUpdateOnFbCatalog();
      }

      // Cache Removed
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultipleProductById(
    ids: string[],
    updateProductDto: UpdateProductDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateProductDto.slug) {
      delete updateProductDto.slug;
    }

    try {
      await this.productModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateProductDto },
      );

      // Cache Removed
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * deleteProductById
   * deleteMultipleProductById
   */
  async deleteProductById(id: string): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.productModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.productModel.findByIdAndDelete(id);

      // Cache Removed
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: 'Success Delete',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleProductById(ids: string[]): Promise<ResponsePayload> {
    try {
      await this.productModel.deleteMany({ _id: ids });

      // Cache Removed
      await this.cacheManager.del(this.cacheProductPage);
      await this.cacheManager.del(this.cacheProductCount);
      this.logger.log('Cache Removed');

      return {
        success: true,
        message: 'Success Delete',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async setProductQtyNotNull(): Promise<ResponsePayload> {
    try {
      const data1 = await this.productModel.countDocuments({});

      const data2 = await this.productModel.countDocuments({
        quantity: { $exists: true },
      });

      const data3 = await this.productModel.countDocuments({
        quantity: { $exists: false },
      });

      const data4 = await this.productModel.countDocuments({
        quantity: { $eq: null },
      });

      await this.productModel.updateMany(
        { quantity: { $eq: null } },
        {
          $set: { quantity: 0 },
        },
      );

      return {
        success: true,
        message: 'Success',
        data: {
          all: data1,
          exists: data2,
          existsNot: data3,
          nullData: data4,
        },
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async setProductImageHttpToHttps(): Promise<ResponsePayload> {
    try {
      const data1 = await this.productModel.find({});

      const mData1 = JSON.parse(JSON.stringify(data1));

      for (const product of mData1) {
        if (product.images && product.images.length) {
          const mImages = product.images.map((m) => {
            return m.replace('http://', 'https://');
          });
          await this.productModel.findByIdAndUpdate(product._id, {
            $set: {
              images: mImages,
            },
          });
        }
      }

      return {
        success: true,
        message: 'Success',
        data: null,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getRelatedProductsByMultiCategoryId(dto: {
    ids: string[];
    limit: number;
  }): Promise<ResponsePayload> {
    try {
      // console.log('dto', dto);
      const mIds = dto.ids.map((m) => new ObjectId(m));

      const data = await this.productModel.aggregate([
        {
          $match: { 'category._id': { $in: mIds } },
        },
        { $sample: { size: dto.limit } },
        {
          $project: {
            name: 1,
            nameEn: 1,
            slug: 1,
            images: 1,
            salePrice: 1,
            quantity: 1,
            author: 1,
            discountAmount: 1,
            discountType: 1,
          },
        },
      ]);

      // const data = await this.productModel.find({ 'category._id': { $in: mIds }}).limit(dto.limit).select('name slug')

      return {
        success: true,
        message: 'Success',
        data: data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async findAllPublished(): Promise<Product[]> {
    return this.productModel.find({}).select('slug title').exec();
  }

  async getMetaFeedXml(): Promise<string> {
    const products = await this.productModel
      .find({ status: 'publish', isFacebookCatalog: true })
      .select(
        '_id nameEn name slug shortDescription description afterDiscountPrice salePrice images quantity publisher brand category',
      )
      .lean();

    const escapeXml = (v: any): string => {
      if (v == null) return '';
      return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const stripHtml = (str: string): string =>
      str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const resolveImageUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `https://amolbooks.com${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const items = products.map((p: any) => {
      const id = String(p._id);
      const title = escapeXml(p.name || p.nameEn || '');
      const rawDesc = p.shortDescription || p.description || p.name || p.nameEn || '';
      const desc = (escapeXml(stripHtml(rawDesc)).slice(0, 5000)) || title;
      const link = `https://amolbooks.com/product-details/${encodeURIComponent(p.slug || '')}`;
      const salePrice = Number(p.salePrice || 0);
      const afterDiscountPrice = Number(p.afterDiscountPrice || 0);
      const price = `${salePrice.toFixed(2)} BDT`;
      const salePriceStr = afterDiscountPrice > 0 && afterDiscountPrice < salePrice
        ? `${afterDiscountPrice.toFixed(2)} BDT`
        : null;
      const availability = p.quantity > 0 ? 'in stock' : 'out of stock';
      const imageLink = resolveImageUrl(p.images?.[0] || '')
        || 'https://amolbooks.com/uploads/images/placeholder.png';
      const additionalImages =
        p.images && p.images.length > 1
          ? p.images
              .slice(1, 10)
              .map((img: string) => `      <g:additional_image_link>${escapeXml(resolveImageUrl(img))}</g:additional_image_link>`)
              .join('\n')
          : '';
      const brand = escapeXml(p.publisher?.name || p.brand?.name || 'Amolbooks');
      const categoryName = p.category?.[0]?.name || p.category?.[0]?.nameEn || '';

      const lines = [
        `    <item>`,
        `      <g:id>${id}</g:id>`,
        `      <g:title>${title}</g:title>`,
        `      <g:description>${desc}</g:description>`,
        `      <g:link>${escapeXml(link)}</g:link>`,
        `      <g:image_link>${escapeXml(imageLink)}</g:image_link>`,
        ...(additionalImages ? [additionalImages] : []),
        `      <g:availability>${availability}</g:availability>`,
        `      <g:price>${price}</g:price>`,
        ...(salePriceStr ? [`      <g:sale_price>${salePriceStr}</g:sale_price>`] : []),
        `      <g:condition>new</g:condition>`,
        `      <g:brand>${brand}</g:brand>`,
        ...(categoryName ? [`      <g:product_type>${escapeXml(categoryName)}</g:product_type>`] : []),
        `    </item>`,
      ];

      return lines.join('\n');
    });

    return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Amolbooks</title>
    <link>https://amolbooks.com</link>
    <description>Amolbooks product catalog</description>
${items.join('\n')}
  </channel>
</rss>`;
  }

  async getMetaFeed(): Promise<string> {
    const products = await this.productModel
      .find({ status: 'publish', isFacebookCatalog: true })
      .select(
        '_id nameEn name slug shortDescription description afterDiscountPrice salePrice images quantity publisher brand category',
      )
      .lean();

    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
      'fb_product_category',
    ];

    const escape = (v: any): string => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = products.map((p: any) => {
      const id = String(p._id);
      const title = p.nameEn || p.name || '';
      const desc = (p.shortDescription || p.description || title).replace(/<[^>]*>/g, '');
      const availability = p.quantity > 0 ? 'in stock' : 'out of stock';
      const price = `${p.afterDiscountPrice || p.salePrice || 0} BDT`;
      const link = `https://amolbooks.com/product/${p.slug}`;
      const imageLink = (p.images && p.images[0]) ? p.images[0] : '';
      const brand = p.publisher?.name || p.brand?.name || 'Amolbooks';
      const category = p.category?.[0]?.nameEn || p.category?.[0]?.name || '';

      return [id, title, desc, availability, 'new', price, link, imageLink, brand, category]
        .map(escape)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * STOCK MANAGEMENT (custom-orders.html)
   * getStockList / updateStock / decreaseStockForItems
   */
  private async getStockSalesMetrics(productIds: Types.ObjectId[]): Promise<
    Map<
      string,
      {
        soldToday: number;
        soldLast30Days: number;
        predictedNeedNext30Days: number;
      }
    >
  > {
    const metrics = new Map();
    if (!productIds.length) {
      return metrics;
    }

    try {
      const now = moment().tz('Asia/Dhaka');
      const todayStart = now.clone().startOf('day').toDate();
      const last30DaysStart = now.clone().subtract(30, 'days').toDate();
      const previous30DaysStart = now.clone().subtract(60, 'days').toDate();
      const quantity = { $ifNull: ['$orderedItems.quantity', 0] };

      const rows = await this.orderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: previous30DaysStart, $lte: now.toDate() },
            orderStatus: {
              $nin: [OrderStatus.CANCEL, OrderStatus.REFUND, OrderStatus.RETURN],
            },
            'orderedItems._id': { $in: productIds },
          },
        },
        { $unwind: '$orderedItems' },
        { $match: { 'orderedItems._id': { $in: productIds } } },
        {
          $group: {
            _id: '$orderedItems._id',
            soldToday: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', todayStart] }, quantity, 0],
              },
            },
            soldLast30Days: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', last30DaysStart] }, quantity, 0],
              },
            },
            soldPrevious30Days: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', previous30DaysStart] },
                      { $lt: ['$createdAt', last30DaysStart] },
                    ],
                  },
                  quantity,
                  0,
                ],
              },
            },
          },
        },
      ]);

      rows.forEach((row) => {
        const soldToday = Math.max(0, Number(row.soldToday) || 0);
        const soldLast30Days = Math.max(0, Number(row.soldLast30Days) || 0);
        const soldPrevious30Days = Math.max(
          0,
          Number(row.soldPrevious30Days) || 0,
        );
        const predictedNeedNext30Days = Math.ceil(
          soldPrevious30Days > 0
            ? soldLast30Days * 0.7 + soldPrevious30Days * 0.3
            : soldLast30Days,
        );

        metrics.set(String(row._id), {
          soldToday,
          soldLast30Days,
          predictedNeedNext30Days,
        });
      });
    } catch (err) {
      this.logger.warn(
        `Stock sales metrics unavailable: ${err?.message || err}`,
      );
    }

    return metrics;
  }

  async getStockList(query: any): Promise<ResponsePayload> {
    try {
      const page = Math.max(1, parseInt(query?.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(query?.limit, 10) || 50));
      const q = (query?.q || '').trim();
      const publisherId = String(query?.publisherId || '').trim();
      const lowOnly = String(query?.lowOnly) === 'true';
      const outOnly = String(query?.outOnly) === 'true';
      const includeSalesMetrics = String(query?.includeSalesMetrics) !== 'false';

      const filter: any = {};
      if (q) {
        const rx = this.utilsService.createRegexFromString(q);
        filter.$or = [
          { name: rx },
          { nameEn: rx },
          { sku: rx },
          { 'publisher.name': rx },
        ];
      }
      if (publisherId) {
        if (!ObjectId.isValid(publisherId)) {
          throw new BadRequestException('Invalid publisher');
        }
        filter['publisher._id'] = new ObjectId(publisherId);
      }
      if (outOnly) {
        filter.stock = { $ne: null, $lte: 0 };
      } else if (lowOnly) {
        filter.stock = { $ne: null };
        filter.$expr = {
          $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 0] }],
        };
      }

      const total = await this.productModel.countDocuments(filter);
      const data = await this.productModel
        .find(filter)
        .select(
          'name nameEn sku images salePrice stock lowStockThreshold totalSold publisher',
        )
        // Rank globally before pagination so best sellers always appear first.
        .sort({ totalSold: -1, name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      let resultData: any[] = data;
      if (includeSalesMetrics && data.length) {
        const productIds = data.map((product: any) => new ObjectId(product._id));
        const salesMetrics = await this.getStockSalesMetrics(productIds);
        const emptyMetrics = {
          soldToday: 0,
          soldLast30Days: 0,
          predictedNeedNext30Days: 0,
        };
        resultData = data.map((product: any) => ({
          ...product,
          ...(salesMetrics.get(String(product._id)) || emptyMetrics),
        }));
      }

      return {
        success: true,
        message: 'Success',
        data: resultData,
        count: total,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getStockPublishers(): Promise<ResponsePayload> {
    try {
      const data = await this.productModel.aggregate([
        {
          $match: {
            'publisher._id': { $ne: null },
            'publisher.name': { $type: 'string', $ne: '' },
          },
        },
        {
          $group: {
            _id: '$publisher._id',
            name: { $first: '$publisher.name' },
            productCount: { $sum: 1 },
          },
        },
        { $sort: { name: 1 } },
      ]);

      return {
        success: true,
        message: 'Success',
        data,
        count: data.length,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getUrgentStock(query: any): Promise<ResponsePayload> {
    try {
      const requestedDays = parseInt(query?.days, 10);
      const publisherId = String(query?.publisherId || '').trim();
      const urgentDays = Math.min(
        90,
        Math.max(1, Number.isFinite(requestedDays) ? requestedDays : 14),
      );
      const filter: any = { stock: { $ne: null } };
      if (publisherId) {
        if (!ObjectId.isValid(publisherId)) {
          throw new BadRequestException('Invalid publisher');
        }
        filter['publisher._id'] = new ObjectId(publisherId);
      }
      const products = await this.productModel
        .find(filter)
        .select('name nameEn sku images salePrice stock publisher')
        .lean();

      const productIds = products.map(
        (product: any) => new ObjectId(product._id),
      );
      const salesMetrics = await this.getStockSalesMetrics(productIds);

      const urgentProducts = products
        .map((product: any) => {
          const stock = Math.max(0, Number(product.stock) || 0);
          const metrics = salesMetrics.get(String(product._id)) || {
            soldToday: 0,
            soldLast30Days: 0,
            predictedNeedNext30Days: 0,
          };
          const predictedNeedNext30Days = Math.max(
            0,
            Number(metrics.predictedNeedNext30Days) || 0,
          );
          const dailyDemand = predictedNeedNext30Days / 30;
          const daysRemaining =
            stock <= 0 ? 0 : dailyDemand > 0 ? stock / dailyDemand : null;
          const isUrgent =
            stock <= 0 ||
            (daysRemaining !== null && daysRemaining <= urgentDays);

          if (!isUrgent) return null;

          return {
            ...product,
            ...metrics,
            daysRemaining:
              daysRemaining === null
                ? null
                : Math.round(daysRemaining * 10) / 10,
            suggestedRestockQty: Math.max(
              0,
              Math.ceil(predictedNeedNext30Days - stock),
            ),
            urgency:
              stock <= 0
                ? 'out'
                : daysRemaining <= 7
                  ? 'critical'
                  : 'warning',
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => {
          const aOut = a.stock <= 0 ? 0 : 1;
          const bOut = b.stock <= 0 ? 0 : 1;
          if (aOut !== bOut) return aOut - bOut;

          const aDays = a.daysRemaining ?? Number.POSITIVE_INFINITY;
          const bDays = b.daysRemaining ?? Number.POSITIVE_INFINITY;
          if (aDays !== bDays) return aDays - bDays;

          if (a.predictedNeedNext30Days !== b.predictedNeedNext30Days) {
            return b.predictedNeedNext30Days - a.predictedNeedNext30Days;
          }
          return String(a.name || '').localeCompare(String(b.name || ''));
        });

      return {
        success: true,
        message: 'Success',
        data: urgentProducts,
        count: urgentProducts.length,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async updateStock(
    id: string,
    body: { stock?: number; lowStockThreshold?: number; note?: string },
    admin?: { _id?: string; name?: string },
  ): Promise<ResponsePayload> {
    try {
      const set: any = {};
      if (
        body?.stock !== undefined &&
        body.stock !== null &&
        (body.stock as any) !== ''
      ) {
        set.stock = Math.max(0, Math.floor(Number(body.stock)) || 0);
      }
      if (
        body?.lowStockThreshold !== undefined &&
        body.lowStockThreshold !== null &&
        (body.lowStockThreshold as any) !== ''
      ) {
        set.lowStockThreshold = Math.max(
          0,
          Math.floor(Number(body.lowStockThreshold)) || 0,
        );
      }
      if (!Object.keys(set).length) {
        return { success: false, message: 'Nothing to update' } as ResponsePayload;
      }

      // Fetch the prior value first so the movement log records an accurate
      // delta — updateOne alone doesn't tell us what the stock used to be.
      const before = await this.productModel
        .findById(id)
        .select('stock sku')
        .lean();
      await this.productModel.updateOne({ _id: id }, { $set: set });

      if (before && set.stock !== undefined) {
        const priorStock = typeof before.stock === 'number' ? before.stock : 0;
        const qtyChange = set.stock - priorStock;
        if (qtyChange !== 0) {
          try {
            await this.stockMovementModel.create({
              product: id,
              sku: before.sku,
              qtyChange,
              stockAfter: set.stock,
              reason: 'manual_adjustment',
              note: body?.note,
              adminId: admin?._id,
              adminName: admin?.name,
            });
          } catch (err) {
            this.logger.warn(
              `Failed to log stock movement for product ${id}: ${err?.message || err}`,
            );
          }
        }
      }

      return { success: true, message: 'Stock updated' } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Record an incoming purchase/restock batch: increments product stock,
   * updates the product's last-known cost, and logs a stock movement.
   */
  async addStockPurchase(
    dto: CreateStockPurchaseDto,
    admin?: { _id?: string; name?: string },
  ): Promise<ResponsePayload> {
    try {
      const product = await this.productModel
        .findById(dto.productId)
        .select('sku stock')
        .lean();
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const qty = Math.max(1, Math.floor(Number(dto.qty)) || 1);
      const unitCost = Math.max(0, Number(dto.unitCost) || 0);
      const totalCost = qty * unitCost;

      const updated = await this.productModel.findByIdAndUpdate(
        dto.productId,
        {
          $inc: { stock: qty },
          $set: { costPrice: unitCost },
        },
        { new: true },
      );

      const purchase = await this.stockPurchaseModel.create({
        product: dto.productId,
        sku: product.sku,
        qty,
        unitCost,
        totalCost,
        supplierName: dto.supplierName,
        note: dto.note,
        adminId: admin?._id,
        adminName: admin?.name,
      });

      try {
        await this.stockMovementModel.create({
          product: dto.productId,
          sku: product.sku,
          qtyChange: qty,
          stockAfter: updated?.stock,
          reason: 'purchase',
          referenceType: 'purchase',
          referenceId: purchase._id,
          note: dto.note,
          adminId: admin?._id,
          adminName: admin?.name,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to log stock movement for purchase ${purchase._id}: ${err?.message || err}`,
        );
      }

      return {
        success: true,
        message: 'Stock purchase recorded',
        data: purchase,
      } as ResponsePayload;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(err.message);
    }
  }

  async getStockMovements(query: GetStockMovementsDto): Promise<ResponsePayload> {
    try {
      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(query?.limit) || 50));
      const filter: any = {};
      if (query?.productId) {
        filter.product = query.productId;
      }

      const total = await this.stockMovementModel.countDocuments(filter);
      const data = await this.stockMovementModel
        .find(filter)
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return {
        success: true,
        message: 'Success',
        data,
        count: total,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Decrement stock for ordered items. Only products with a non-null stock are
   * affected. Safe to call fire-and-forget after an order is saved.
   */
  async decreaseStockForItems(items: any[]): Promise<void> {
    if (!Array.isArray(items) || !items.length) return;
    const ops = items
      .map((it) => {
        const id = it?._id || it?.product || it?.productId;
        const qty = Math.max(1, Math.floor(Number(it?.quantity)) || 1);
        if (!id) return null;
        return {
          updateOne: {
            filter: { _id: id, stock: { $ne: null } },
            update: { $inc: { stock: -qty } },
          },
        };
      })
      .filter(Boolean);
    if (!ops.length) return;
    try {
      await this.productModel.bulkWrite(ops as any);
    } catch (err) {
      this.logger.warn(`decreaseStockForItems failed: ${err?.message || err}`);
    }
  }
}
