import React, { useState } from 'react';
import Category from './Category';
import Hero from './Hero';
import OfferBanners from './OfferBanners';
import Products from './Products';
import type { StoreBanner, StoreCategory, StoreProduct } from '../types';

type HomeProps = {
  categories: StoreCategory[];
  products: StoreProduct[];
  heroBanners: StoreBanner[];
  offerBanners: StoreBanner[];
  favorites: string[];
  onCategoryPress: (category: string) => void;
  onExplorePress: () => void;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
};

export default function Home({
  categories,
  products,
  heroBanners,
  offerBanners,
  favorites,
  onCategoryPress,
  onExplorePress,
  onFavoritePress,
  onAddToCart,
}: HomeProps) {
  const [heroIndex, setHeroIndex] = useState(0);

  return (
    <>
      <Hero
        banners={heroBanners}
        activeIndex={heroIndex}
        onIndexChange={setHeroIndex}
        onExplorePress={onExplorePress}
      />
      <Category
        categories={categories}
        onCategoryPress={onCategoryPress}
        onViewAllPress={onExplorePress}
      />
      <Products
        products={products}
        favorites={favorites}
        onFavoritePress={onFavoritePress}
        onAddToCart={onAddToCart}
      />
      <OfferBanners banners={offerBanners} onShopPress={onExplorePress} />
    </>
  );
}
