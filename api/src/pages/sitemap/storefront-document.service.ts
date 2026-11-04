import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { STOREFRONT_PAGE_VIEW_TITLE_SYNC } from './storefront-page-view-title-sync';
import { ProductService } from '../product/product.service';
import { SpecialPackageService } from '../offers/special-package/special-package.service';
import { CatalogueSeoService } from './catalogue-seo.service';
import { CatalogueKind, renderCatalogueSeo } from './catalogue-seo.utils';

// Hide only the server fallback; Angular removes this wrapper when it renders.
export const STOREFRONT_SEO_FALLBACK_HEAD = `<script>document.documentElement.classList.add('ab-js-startup');</script>
<style>html.ab-js-startup #amol-seo-fallback { display: none; }</style>`;

const ORIGIN = 'https://www.amolbooks.com';
const PAGE_TITLES = {
  '': 'আমল বুকস — ইসলামিক বইয়ের অনলাইন বইঘর',
  'product-list': 'ইসলামিক বইয়ের সংগ্রহ',
  'category-list': 'বইয়ের বিষয়সমূহ',
  'author-list': 'বইয়ের লেখকসমূহ',
  'publisher-list': 'বইয়ের প্রকাশনীসমূহ',
  blogs: 'আমল বুকস ব্লগ',
  offers: 'বইয়ের অফার ও প্যাকেজ',
  'contact-us': 'আমল বুকসের সাথে যোগাযোগ',
};
const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const AUTHOR_PATH = /^author-list\/author-details\/(.+?)\/?$/;
const AUTHOR_NOT_FOUND =
  '<!doctype html><html lang="bn"><head><meta name="robots" content="noindex"><title>লেখক পাওয়া যায়নি | Amolbooks</title></head><body><h1>লেখক পাওয়া যায়নি</h1><a href="https://www.amolbooks.com/author-list">সব লেখক</a></body></html>';

// /product-list?publisher=<slug> (with or without publisherId) and ?categories=<slug> are the
// publisher and category pages; any other book list keeps the general page.
function catalogueFilter(query: Record<string, any>): { kind: CatalogueKind; slug: string; id?: string } | null {
  const value = (key: string) => {
    const raw = Array.isArray(query[key]) ? query[key][0] : query[key];
    return typeof raw === 'string' ? raw.trim() : '';
  };
  if (value('publisher') || value('publisherId')) return { kind: 'publisher', slug: value('publisher'), id: value('publisherId') };
  if (value('categories')) return { kind: 'category', slug: value('categories') };
  return null;
}

// Keep metadata in step with Angular navigation as well as full page loads.
export const STOREFRONT_SEO_NAVIGATION = `<script>
(function(){
  if(window.__amolSeoNavigation)return;
  window.__amolSeoNavigation=true;
  var path=location.pathname, key=pageKey(), revision=0;
  // A book list for one publisher or category has metadata of its own.
  function pageKey(){
    if(location.pathname!=='/product-list')return location.pathname;
    var query=new URLSearchParams(location.search),params=[];
    ['publisher','publisherId','categories'].forEach(function(name){var value=query.get(name);if(value)params.push(name+'='+encodeURIComponent(value));});
    return location.pathname+(params.length?'?'+params.join('&'):'');
  }
  var titleDescriptor=Object.getOwnPropertyDescriptor(Document.prototype,'title');
  var titleState={path:path,title:document.title,ready:Promise.resolve()};
  window.__amolSeoTitleState=titleState;
  function applyTitle(){
    if(titleState.path===location.pathname&&titleState.title&&document.head.querySelector('title')){
      titleDescriptor.set.call(document,titleState.title);
    }
  }
  if(titleDescriptor&&titleDescriptor.get&&titleDescriptor.set){
    Object.defineProperty(document,'title',{
      configurable:true,
      get:function(){return titleState.path===location.pathname&&titleState.title||titleDescriptor.get.call(document);},
      set:function(value){
        titleDescriptor.set.call(document,titleState.path===location.pathname&&titleState.title||value);
      }
    });
    new MutationObserver(function(){
      if(!window.document||!window.location)return;
      if(titleState.path===location.pathname&&titleState.title&&titleDescriptor.get.call(document)!==titleState.title)applyTitle();
    }).observe(document.head,{subtree:true,childList:true,characterData:true});
  }
  ${STOREFRONT_PAGE_VIEW_TITLE_SYNC}
  var selector='title,link[rel="canonical"],meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[property^="product:"],meta[name^="twitter:"],script[type="application/ld+json"]';
  function update(){
    var next=pageKey();
    if(key===next)return;
    key=next;
    path=location.pathname;
    var current=++revision;
    var state={path:path,title:null,ready:Promise.resolve()};
    titleState=state;window.__amolSeoTitleState=state;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function(node){node.remove();});
    var canonical=document.querySelector('link[rel="canonical"]');
    if(canonical)canonical.href='https://www.amolbooks.com'+key;
    if(!/^\\/(?:$|product-list$|category-list$|author-list$|publisher-list$|blogs$|offers$|contact-us$|product-details\\/|special-package-details\\/|author-list\\/author-details\\/)/.test(path))return;
    state.ready=fetch('/api/storefront-document'+key).then(function(response){
      if(!response.ok)throw new Error('SEO document unavailable');
      return response.text();
    }).then(function(html){
      if(current!==revision)return;
      var parsed=new DOMParser().parseFromString(html,'text/html');
      state.title=parsed.title;
      document.head.querySelectorAll(selector).forEach(function(node){node.remove();});
      parsed.head.querySelectorAll(selector).forEach(function(node){document.head.appendChild(document.importNode(node,true));});
      applyTitle();
    }).catch(function(){});
  }
  ['pushState','replaceState'].forEach(function(name){
    var original=history[name];
    history[name]=function(){var result=original.apply(this,arguments);update();return result;};
  });
  window.addEventListener('popstate',update);
})();
</script>`;

@Injectable()
export class StorefrontDocumentService {
  constructor(
    private readonly products: ProductService,
    private readonly packages: SpecialPackageService,
    private readonly catalogue: CatalogueSeoService,
  ) {}

  private async homepageImagePreloads(path: string): Promise<string> {
    if (path !== '') return '';
    try {
      const result = await this.products.getAllProducts({
        filter: { status: 'publish', quantity: { $gt: 0 } },
        pagination: { pageSize: 2, currentPage: 0 },
        sort: { totalSold: -1, priority: -1 },
        select: { images: 1 },
      } as any);
      return (Array.isArray(result.data) ? result.data : []).map(book => {
        const image = Array.isArray(book.images) ? book.images[0] : '';
        const url = new URL(image || '', 'https://apisub.amolbooks.com/api/');
        if (url.origin !== 'https://apisub.amolbooks.com') return '';
        const match = url.pathname.match(/^\/api\/upload\/images\/([\w-][\w .()-]*\.(?:jpe?g|png|webp))$/i);
        if (!match) return '';
        const base = 'https://apisub.amolbooks.com/api/storefront-images/';
        const file = encodeURIComponent(decodeURIComponent(match[1]));
        return `<link rel="preload" as="image" href="${base}320/${file}" imagesrcset="${base}320/${file} 320w, ${base}640/${file} 640w" imagesizes="(max-width: 767px) 44vw, 242px" fetchpriority="high">`;
      }).join('');
    } catch (_) {
      // Optional hints must never prevent the storefront from loading.
      return '';
    }
  }

  // notFound: called instead of answering 404 for an unknown author (the plain storefront then loads).
  async send(
    path: string,
    res: Response,
    query: Record<string, any> = {},
    notFound?: () => void,
  ): Promise<void> {
    let page = '';
    let status = 200;
    const author = path.match(AUTHOR_PATH);
    const filter = path === 'product-list' ? catalogueFilter(query) : null;
    const listed = filter
      ? await this.catalogue.page(filter.kind, filter.slug, filter.id)
      : null;
    // Reuse the detail renderers so prices, canonicals and missing-page handling agree.
    const capture = {
      setHeader: () => capture,
      status: (value: number) => {
        status = value;
        return capture;
      },
      send: (value: string) => {
        page = value;
        return capture;
      },
    };
    if (path.startsWith('product-details/')) {
      await this.products.getProductOgHtml(
        path.slice('product-details/'.length),
        capture,
      );
      if (status === 404 && path.endsWith('/')) {
        await this.products.getProductOgHtml(
          path.slice('product-details/'.length, -1),
          capture,
        );
      }
    } else if (path.startsWith('special-package-details/')) {
      await this.packages.getSpecialPackageOgHtml(
        path.slice('special-package-details/'.length).replace(/\/$/, ''),
        capture as any,
      );
    } else if (author) {
      const found = await this.catalogue.page('author', author[1]);
      if (!found && notFound) return notFound();
      if (found) {
        page = renderCatalogueSeo('author', found.entity, found.books, found.total);
      } else {
        status = 404;
        page = AUTHOR_NOT_FOUND;
      }
    } else if (listed) {
      page = renderCatalogueSeo(filter.kind, listed.entity, listed.books, listed.total);
    } else if (Object.prototype.hasOwnProperty.call(PAGE_TITLES, path)) {
      const title = escapeHtml(PAGE_TITLES[path]);
      const canonical = `${ORIGIN}/${path}`;
      const links =
        path === '' || path === 'product-list'
          ? (await this.products.findAllPublished())
              .map(
                (book) =>
                  `<li><a href="${ORIGIN}/product-details/${encodeURIComponent(
                    book.slug,
                  )}">${escapeHtml(book.name)}</a></li>`,
              )
              .join('')
          : path === 'offers'
          ? (await this.packages.findAllForSitemap())
              .map(
                (offer) =>
                  `<li><a href="${ORIGIN}/special-package-details/${
                    offer._id
                  }">${escapeHtml(offer.name)}</a></li>`,
              )
              .join('')
          : '';
      page = `<html><head><title>${title} | Amolbooks</title><meta name="description" content="${title} — Amolbooks"><link rel="canonical" href="${canonical}"><meta name="robots" content="index, follow, max-image-preview:large"></head><body><main><h1>${title}</h1><nav><a href="${ORIGIN}/">হোম</a> <a href="${ORIGIN}/product-list">সব বই</a> <a href="${ORIGIN}/offers">অফার</a></nav>${
        links ? `<ul>${links}</ul>` : ''
      }</main></body></html>`;
    } else {
      res.status(404).setHeader('X-Robots-Tag', 'noindex');
      res.send('Not found');
      return;
    }
    if (status !== 200) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(status).type('html').send(page);
      return;
    }
    const shell = readFileSync(
      join(__dirname, '../../../..', 'ui/dist/angular-ui/browser/index.html'),
      'utf8',
    );
    const head = page.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '';
    const body = page.match(/<body>([\s\S]*?)<\/body>/i)?.[1] || '';
    const imagePreloads = await this.homepageImagePreloads(path);
    const html = shell
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(
        /<meta\b[^>]*(?:name=["'](?:description|robots|keywords|twitter:[^"']*)["']|property=["'](?:og:|product:)[^"']*["'])[^>]*>/gi,
        '',
      )
      .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
      .replace(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
        '',
      )
      .replace('</head>', () => `${imagePreloads}${STOREFRONT_SEO_FALLBACK_HEAD}${head}${STOREFRONT_SEO_NAVIGATION}</head>`)
      // Angular replaces its host contents at bootstrap; without JS the content remains usable.
      .replace(
        /<app-root\b[^>]*>[\s\S]*?<\/app-root>/i,
        () => `<app-root><div id="amol-seo-fallback">${body}</div></app-root>`,
      );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).type('html').send(html);
  }
}
