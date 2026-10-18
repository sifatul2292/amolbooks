import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { STOREFRONT_PAGE_VIEW_TITLE_SYNC } from './storefront-page-view-title-sync';
import { ProductService } from '../product/product.service';
import { SpecialPackageService } from '../offers/special-package/special-package.service';

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

// Keep metadata in step with Angular navigation as well as full page loads.
export const STOREFRONT_SEO_NAVIGATION = `<script>
(function(){
  if(window.__amolSeoNavigation)return;
  window.__amolSeoNavigation=true;
  var path=location.pathname, revision=0;
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
    if(path===location.pathname)return;
    path=location.pathname;
    var current=++revision;
    var state={path:path,title:null,ready:Promise.resolve()};
    titleState=state;window.__amolSeoTitleState=state;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function(node){node.remove();});
    var canonical=document.querySelector('link[rel="canonical"]');
    if(canonical)canonical.href='https://www.amolbooks.com'+path;
    if(!/^\\/(?:$|product-list$|category-list$|author-list$|publisher-list$|blogs$|offers$|contact-us$|product-details\\/|special-package-details\\/)/.test(path))return;
    state.ready=fetch('/api/storefront-document'+path).then(function(response){
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
  ) {}

  async send(path: string, res: Response): Promise<void> {
    let page = '';
    let status = 200;
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
      .replace('</head>', () => `${STOREFRONT_SEO_FALLBACK_HEAD}${head}${STOREFRONT_SEO_NAVIGATION}</head>`)
      // Angular replaces its host contents at bootstrap; without JS the content remains usable.
      .replace(
        /<app-root\b[^>]*>[\s\S]*?<\/app-root>/i,
        () => `<app-root><div id="amol-seo-fallback">${body}</div></app-root>`,
      );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).type('html').send(html);
  }
}
