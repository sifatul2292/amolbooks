import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import {
  AddCartDto,
  CartItemDto,
  UpdateCartDto,
  UpdateCartQty,
} from '../../dto/cart.dto';
import { Product } from '../../interfaces/common/product.interface';
import { Cart } from 'src/interfaces/common/cart.interface';
import { User } from '../../interfaces/user/user.interface';
import { VariationOption } from '../../interfaces/common/variation.interface';
import { SpecialPackage } from '../../interfaces/common/special-package.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class CartService {
  private logger = new Logger(CartService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<Cart>,
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('SpecialPackage')
    private readonly specialPackageModel: Model<SpecialPackage>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addToCart()
   * addToCartMultiple()
   */
  // async addToCart(
  //   addCartDto: AddCartDto,
  //   user: User,
  // ): Promise<ResponsePayload> {
  //   const userId = user._id;
  //   const data = addCartDto;
  //   const final = { ...data, ...{ user: userId } };
  //
  //   try {
  //     const cartData = await this.cartModel.findOne({
  //       user: userId,
  //       product: addCartDto.product,
  //     });
  //     if (cartData) {
  //       await this.cartModel.findByIdAndUpdate(cartData._id, {
  //         $inc: { selectedQty: addCartDto.selectedQty },
  //       });
  //       return {
  //         success: true,
  //         message: 'Cart Item Updated Successfully!',
  //       } as ResponsePayload;
  //     } else {
  //       const newData = new this.cartModel(final);
  //       const saveData = await newData.save();
  //
  //       await this.userModel.findOneAndUpdate(
  //         { _id: userId },
  //         {
  //           $push: {
  //             carts: saveData._id,
  //           },
  //         },
  //       );
  //
  //       return {
  //         success: true,
  //         message: 'Added to Cart Successfully!',
  //       } as ResponsePayload;
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  /**
   * addToCart()
   * addToCartMultiple()
   */
  async addToCart(
    addCartDto: AddCartDto,
    user: User,
  ): Promise<ResponsePayload> {
    const userId = user._id;
    const data = addCartDto;
    const final = { ...data, ...{ user: userId } };

    try {
      let cartData;
      if (addCartDto.cartType == 1) {
        cartData = await this.cartModel.findOne({
          user: userId,
          specialPackage: addCartDto.specialPackage,
        });
      } else if (addCartDto.cartType == 2) {
        cartData = await this.cartModel.findOne({
          user: userId,
          specialPackage: addCartDto.specialPackage,
        });
      } else {
        if (addCartDto.selectedVariation) {
          cartData = await this.cartModel.find({
            user: userId,
            product: new ObjectId(addCartDto.product),
            selectedVariation: new ObjectId(addCartDto.selectedVariation),
          });
          if (cartData.length == 0) {
            cartData = null;
          }
        } else {
          cartData = await this.cartModel.findOne({
            user: userId,
            product: addCartDto.product,
          });
        }
      }

      if (cartData && cartData != null) {
        await this.cartModel.findByIdAndUpdate(cartData._id, {
          $inc: { selectedQty: addCartDto.selectedQty },
        });
        return {
          success: true,
          message: 'Cart Item Updated Successfully!',
        } as ResponsePayload;
      } else {
        const newData = new this.cartModel(final);
        const saveData = await newData.save();

        await this.userModel.findOneAndUpdate(
          { _id: userId },
          {
            $push: {
              carts: saveData._id,
            },
          },
        );

        return {
          success: true,
          message: 'Added to Cart Successfully!',
        } as ResponsePayload;
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async addToCartMultiple(
    addCartDto: AddCartDto[],
    user: User,
  ): Promise<ResponsePayload> {
    const userId = user._id;

    try {
      for (const data of addCartDto) {
        const cartData = await this.cartModel.findOne({
          user: userId,
          product: data.product,
        });

        if (cartData) {
          await this.cartModel.findByIdAndUpdate(cartData._id, {
            $inc: { selectedQty: data.selectedQty },
          });
        } else {
          const final = { ...data, ...{ user: userId } };
          const newData = new this.cartModel(final);
          const saveData = await newData.save();

          await this.userModel.findOneAndUpdate(
            { _id: userId },
            {
              $push: {
                carts: saveData._id,
              },
            },
          );
        }
      }
      return {
        success: true,
        message: 'Multiple Added to Cart Successfully!',
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getCartByUserId()
   */
  // async getCartByUserId(user: User): Promise<ResponsePayload> {
  //   try {
  //     const data = await this.cartModel
  //       .find({ user: user._id })
  //       .populate(
  //         'product',
  //         'name author costPrice slug description salePrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit',
  //       );
  //
  //     return {
  //       data: data,
  //       success: true,
  //       message: 'Success',
  //     } as ResponsePayload;
  //   } catch (err) {
  //     console.log(err);
  //     throw new InternalServerErrorException();
  //   }
  // }

  /**
   * getCartByUserId()
   */
  async getCartByUserId(user: User): Promise<ResponsePayload> {
    try {
      const data = await this.cartModel
        .find({ user: user._id })
        .populate(
          'product',
          'name nameEn slug description salePrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit weight',
        )
        .populate('specialPackage');

      // console.log('data', data);

      const finalData = [];
      // console.warn(data)
      if (data && data.length) {
        data.map(async (item: any) => {
          if (item.cartType == 1 && item.specialPackage != null) {
            const images = [item.specialPackage.image];
            item = {
              ...item._doc,
              ...{
                product: { ...item.specialPackage._doc, ...{ images: images } },
              },
            };
            delete item.comboPackage;
            delete item['product']['image'];
            delete item['product']['products'];
          }

          // else if (item.cartType == 2 && item.specialPackage != null) {
          //   const images = [item.specialPackage.image];
          //   item = {
          //     ...item._doc,
          //     ...{
          //       product: { ...item.specialPackage._doc, ...{ images: images } },
          //     },
          //   };
          //   delete item.specialPackage;
          //   delete item['product']['image'];
          //   delete item['product']['products'];
          // }
          // (item.cartType == 2 && item.specialPackage == null) ||

          else if (item.cartType == 1 && item.specialPackage == null) {
            item = null;
          } else {
            // if (item.product.hasVariations) {
            //
            //   let variationFound = false;
            //   item.product.variationsOptions.map((variation) => {
            //     if (String(item.selectedVariation) === String(variation._id)) {
            //       item = { ...item._doc, ...{ selectedVariation: variation } };
            //       if (item.selectedQty <= item.selectedVariation.quantity) {
            //         variationFound = true;
            //       }
            //       // console.warn(item)
            //     }
            //   });
            //
            //   if (!variationFound) {
            //     const user = {
            //       _id: String(item.user),
            //     };
            //     await this.deleteCartById(String(item._id), user as User);
            //     item = null;
            //   }
            // }
          }
          // console.warn(item)
          finalData.push(item);
        });
      }
      const filterData = finalData.filter((item) => item != null);
      // console.warn(finalData)
      return {
        data: filterData,
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  /**
   * deleteCartById()
   */
  async deleteCartById(id: string, user: User): Promise<ResponsePayload> {
    try {
      await this.cartModel.findByIdAndDelete(id);

      await this.userModel.findByIdAndUpdate(user._id, {
        $pull: { carts: { $in: id } },
      });

      return {
        success: true,
        message: 'Item Removed Successfully From Cart!',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateCartDyId()
   */
  async updateCartById(
    id: string,
    updateCartDto: UpdateCartDto,
  ): Promise<ResponsePayload> {
    try {
      console.log('updateCartDto', updateCartDto);
      await this.cartModel.findByIdAndUpdate(id, {
        $set: updateCartDto,
      });

      return {
        success: true,
        message: 'Item Updated Successfully!',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateCartQty()
   */
  //   async updateCartQty(
  //     id: string,
  //     updateCartQty: UpdateCartQty,
  //   ): Promise<ResponsePayload> {
  //     try {
  //       const data = await this.cartModel
  //         .findById(id)
  //         .populate('product', 'quantity trackQuantity name cartLimit');
  //
  //       if (updateCartQty.type == 'increment') {
  //         if (data.product.cartLimit > 0) {
  //           if (data.selectedQty < data.product.cartLimit) {
  //             if (data.product.trackQuantity == true) {
  //               if (data.selectedQty >= data.product.quantity) {
  //                 return {
  //                   success: true,
  //                   message: 'Product quantity is not available',
  //                   type: 'not available',
  //                 } as ResponsePayload;
  //               } else {
  //                 await this.cartModel.findByIdAndUpdate(id, {
  //                   $inc: {
  //                     selectedQty: updateCartQty.selectedQty,
  //                   },
  //                 });
  //               }
  //             } else {
  //               await this.cartModel.findByIdAndUpdate(id, {
  //                 $inc: {
  //                   selectedQty: updateCartQty.selectedQty,
  //                 },
  //               });
  //             }
  //           } else {
  //             return {
  //               success: true,
  //               message: `Can not order more than ${data.product.cartLimit}`,
  //               type: 'not available',
  //             } as ResponsePayload;
  //           }
  //         } else {
  //           if (data.product.trackQuantity == true) {
  //             if (data.selectedQty >= data.product.quantity) {
  //               return {
  //                 success: true,
  //                 message: 'Product quantity is not available',
  //                 type: 'not available',
  //               } as ResponsePayload;
  //             } else {
  //               await this.cartModel.findByIdAndUpdate(id, {
  //                 $inc: {
  //                   selectedQty: updateCartQty.selectedQty,
  //                 },
  //               });
  //             }
  //           } else {
  //             await this.cartModel.findByIdAndUpdate(id, {
  //               $inc: {
  //                 selectedQty: updateCartQty.selectedQty,
  //               },
  //             });
  //           }
  //         }
  //       }
  //
  //       if (updateCartQty.type == 'decrement') {
  //         await this.cartModel.findByIdAndUpdate(id, {
  //           $inc: {
  //             selectedQty: -updateCartQty.selectedQty,
  //           },
  //         });
  //       }
  //
  //       return {
  //         success: true,
  //         message: 'Quantity Updated Successfully!',
  //         type: 'available',
  //       } as ResponsePayload;
  //     } catch (err) {
  //       console.log(err);
  //       throw new InternalServerErrorException(err.message);
  //     }
  //   }
  // }

  /**
   * updateCartQty()
   */
  async updateCartQty(
    id: string,
    updateCartQty: UpdateCartQty,
  ): Promise<ResponsePayload> {
    console.log('updateCartQty', updateCartQty);
    console.log('id', id);
    try {
      let data: any = await this.cartModel
        .findById(id)
        .populate(
          'product',
          'quantity hasVariations variationsOptions trackQuantity name cartLimit',
        );
      if (data) {
        if (data.cartType == 1) {
        } else {
          if (data.selectedVariation) {
            data.product.variationsOptions.map((variation) => {
              if (String(data.selectedVariation) === String(variation._id)) {
                data = { ...data._doc, ...{ selectedVariation: variation } };
              }
            });
          }
        }
      }
      if (updateCartQty.type == 'increment') {
        if (data.cartType == 1 || data.cartType == 2) {
          await this.cartModel.findByIdAndUpdate(id, {
            $inc: {
              selectedQty: updateCartQty.selectedQty,
            },
          });
        } else {
          if (data.product.cartLimit > 0) {
            if (data.selectedQty < data.product.cartLimit) {
              if (data.product.trackQuantity == true) {
                if (data.product.hasVariations) {
                  if (
                    data.selectedQty >=
                    (data.selectedVariation as VariationOption).quantity
                  ) {
                    return {
                      success: true,
                      message: 'Product quantity is not available',
                      type: 'not available',
                    } as ResponsePayload;
                  } else {
                    await this.cartModel.findByIdAndUpdate(id, {
                      $inc: {
                        selectedQty: updateCartQty.selectedQty,
                      },
                    });
                  }
                } else {
                  if (data.selectedQty >= data.product.quantity) {
                    return {
                      success: true,
                      message: 'Product quantity is not available',
                      type: 'not available',
                    } as ResponsePayload;
                  } else {
                    await this.cartModel.findByIdAndUpdate(id, {
                      $inc: {
                        selectedQty: updateCartQty.selectedQty,
                      },
                    });
                  }
                }
              } else {
                if (data.product.hasVariations) {
                  if (
                    data.selectedQty >=
                    (data.selectedVariation as VariationOption).quantity
                  ) {
                    return {
                      success: true,
                      message: 'Product quantity is not available',
                      type: 'not available',
                    } as ResponsePayload;
                  } else {
                    await this.cartModel.findByIdAndUpdate(id, {
                      $inc: {
                        selectedQty: updateCartQty.selectedQty,
                      },
                    });
                  }
                } else {
                  await this.cartModel.findByIdAndUpdate(id, {
                    $inc: {
                      selectedQty: updateCartQty.selectedQty,
                    },
                  });
                }
              }
            } else {
              return {
                success: true,
                message: `Can not order more than ${data.product.cartLimit}`,
                type: 'not available',
              } as ResponsePayload;
            }
          } else {
            if (data.product.trackQuantity == true) {
              if (data.product.hasVariations) {
                if (
                  data.selectedQty >=
                  (data.selectedVariation as VariationOption).quantity
                ) {
                  return {
                    success: true,
                    message: 'Product quantity is not available',
                    type: 'not available',
                  } as ResponsePayload;
                } else {
                  await this.cartModel.findByIdAndUpdate(id, {
                    $inc: {
                      selectedQty: updateCartQty.selectedQty,
                    },
                  });
                }
              } else {
                if (data.selectedQty >= data.product.quantity) {
                  return {
                    success: true,
                    message: 'Product quantity is not available',
                    type: 'not available',
                  } as ResponsePayload;
                } else {
                  await this.cartModel.findByIdAndUpdate(id, {
                    $inc: {
                      selectedQty: updateCartQty.selectedQty,
                    },
                  });
                }
              }
            } else {
              if (data.product.hasVariations) {
                if (
                  data.selectedQty >=
                  (data.selectedVariation as VariationOption).quantity
                ) {
                  return {
                    success: true,
                    message: 'Product quantity is not available',
                    type: 'not available',
                  } as ResponsePayload;
                } else {
                  await this.cartModel.findByIdAndUpdate(id, {
                    $inc: {
                      selectedQty: updateCartQty.selectedQty,
                    },
                  });
                }
              } else {
                await this.cartModel.findByIdAndUpdate(id, {
                  $inc: {
                    selectedQty: updateCartQty.selectedQty,
                  },
                });
              }
            }
          }
        }
      }

      if (updateCartQty.type == 'decrement') {
        await this.cartModel.findByIdAndUpdate(id, {
          $inc: {
            selectedQty: -updateCartQty.selectedQty,
          },
        });
      }
      // if (updateCartQty.type == 'increment') {
      //   if (data.product.cartLimit > 0) {
      //     if (data.selectedQty < data.product.cartLimit) {
      //       if (data.product.trackQuantity == true) {
      //         if (data.selectedQty >= data.product.quantity) {
      //           return {
      //             success: true,
      //             message: 'Product quantity is not available',
      //             type: 'not available',
      //           } as ResponsePayload;
      //         } else {
      //           await this.cartModel.findByIdAndUpdate(id, {
      //             $inc: {
      //               selectedQty: updateCartQty.selectedQty,
      //             },
      //           });
      //         }
      //       } else {
      //         await this.cartModel.findByIdAndUpdate(id, {
      //           $inc: {
      //             selectedQty: updateCartQty.selectedQty,
      //           },
      //         });
      //       }
      //     } else {
      //       return {
      //         success: true,
      //         message: `Can not order more than ${data.product.cartLimit}`,
      //         type: 'not available',
      //       } as ResponsePayload;
      //     }
      //   } else {
      //     if (data.product.trackQuantity == true) {
      //       if (data.selectedQty >= data.product.quantity) {
      //         return {
      //           success: true,
      //           message: 'Product quantity is not available',
      //           type: 'not available',
      //         } as ResponsePayload;
      //       } else {
      //         await this.cartModel.findByIdAndUpdate(id, {
      //           $inc: {
      //             selectedQty: updateCartQty.selectedQty,
      //           },
      //         });
      //       }
      //     } else {
      //       await this.cartModel.findByIdAndUpdate(id, {
      //         $inc: {
      //           selectedQty: updateCartQty.selectedQty,
      //         },
      //       });
      //     }
      //   }
      // }
      //
      // if (updateCartQty.type == 'decrement') {
      //   await this.cartModel.findByIdAndUpdate(id, {
      //     $inc: {
      //       selectedQty: -updateCartQty.selectedQty,
      //     },
      //   });
      // }

      return {
        success: true,
        message: 'Quantity Updated Successfully!',
        type: 'available',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getLocalCartItems(
    cartItemDto: CartItemDto[],
  ): Promise<ResponsePayload> {
    try {
      const finalCartItems: any[] = [];
      for (const item of cartItemDto) {
        if (item.cartType === 1) {
          const comboData = await this.specialPackageModel.findById(
            item.specialPackage,
          );
          const jComboData = JSON.parse(JSON.stringify(comboData));
          const cCartItem = {
            product: {
              _id: jComboData._id,
              name: jComboData.name,
              slug: jComboData.slug,
              salePrice: jComboData.salePrice,
              discountType: jComboData.discountType,
              discountAmount: jComboData.discountAmount,
              images: jComboData.image ? [jComboData.image] : [],
              quantity: jComboData.quantity,
            },
            selectedQty: item.selectedQty,
            cartType: 1,
          };
          finalCartItems.push(cCartItem);
        } else {
          const productData = await this.productModel.findById(item.product);
          const jProductData = JSON.parse(JSON.stringify(productData));
          const pCartItem = {
            product: {
              _id: jProductData._id,
              name: jProductData.name,
              slug: jProductData.slug,
              salePrice: jProductData.salePrice,
              discountType: jProductData.discountType,
              discountAmount: jProductData.discountAmount,
              images: jProductData.images,
              quantity: jProductData.quantity,
            },
            selectedQty: item.selectedQty,
            cartType: 0,
          };
          finalCartItems.push(pCartItem);
        }
      }

      return {
        success: true,
        message: 'Item Updated Successfully!',
        data: finalCartItems,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }
}
