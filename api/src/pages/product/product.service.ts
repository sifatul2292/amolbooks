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
    private configService: ConfigService,
    private utilsService: UtilsService,
    private fbCatalogService: FbCatalogService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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

      const data = await this.productModel
        .find(mFilter)
        .select(
          'name nameEn seoKeyword seoTitle seoDescription author discountType slug discountAmount tags quantity regularPrice salePrice ratingTotal images ratingCount',
        )
        .skip(Number(skip))
        .limit(Number(limit))
        .sort(sortQuery);

      const totalCount = await this.productModel.countDocuments(mFilter);

      return {
        success: true,
        message: 'Success! Data fetch successfully.',
        data,
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

    // Finalize
    if (Object.keys(mFilter).length) {
      // Main
      aggregateStages.push({ $match: mFilter });

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
          ...{ ...dataAggregates[0] },
          ...{
            success: true,
            message: 'Success',
            filterGroup: allFilterGroups,
          },
        } as ResponsePayload;
      } else {
        return {
          data: dataAggregates,
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
    try {
      const data = await this.productModel
        .findById(id)
        .select(select)
        .populate('tags');

      return {
        success: true,
        message: 'Success',
        data,
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

      // this.updateSpecificProduct('65db41b467e6bde2558cf9a2');
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getProductByIds(
    getProductByIdsDto: GetProductByIdsDto,
    select: string,
  ): Promise<ResponsePayload> {
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
}
