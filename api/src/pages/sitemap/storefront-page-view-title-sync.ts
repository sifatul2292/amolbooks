// Amend existing GA4 page views; never create or retry analytics events.
export const STOREFRONT_PAGE_VIEW_TITLE_SYNC = `
  function pageViewTitle(input,body){
    try{
      if(typeof input!=='string'&&!(input instanceof URL))return null;
      var url=new URL(String(input),location.href);
      if(!/^(?:[a-z0-9-]+\\.)*google-analytics\\.com$/.test(url.hostname)&&
         !['server.amolbooks.com','load.server.amolbooks.com'].includes(url.hostname))return null;
      if(!/^\\/(?:g\\/)?collect$/.test(url.pathname))return null;
      if(typeof body==='string'&&/[\\r\\n]/.test(body))return null;
      var params=typeof body==='string'?new URLSearchParams(body):null;
      function value(key){return url.searchParams.get(key)||(params&&params.get(key));}
      if(value('en')!=='page_view'||!value('dl'))return null;
      var page=new URL(value('dl'));
      var state=window.__amolSeoTitleState;
      function pathKey(value){try{return decodeURIComponent(value.replace(/%(?![a-f0-9]{2})/gi,'%25'));}catch(_){return value;}}
      if(!state||pathKey(state.path)!==pathKey(page.pathname)||!['www.amolbooks.com','amolbooks.com',location.hostname].includes(page.hostname))return null;
      return {state:state,apply:function(){
        if(!state.title)return {url:String(input),body:body};
        // GA4 uses percent encoding, not form encoding: spaces must stay %20.
        var encoded=encodeURIComponent(state.title),nextBody=body;
        function replaceTitle(value){return value.replace(/(^|&)dt=[^&]*/g,function(_,prefix){return prefix+'dt='+encoded;});}
        if(params&&params.has('dt'))nextBody=replaceTitle(body);
        if(url.searchParams.has('dt'))url.search=replaceTitle(url.search.slice(1));
        else if(!params||!params.has('dt'))url.search+=(url.search?'&':'?')+'dt='+encoded;
        return {url:url.href,body:nextBody};
      }};
    }catch(_){return null;}
  }
  function waitForTitle(proof){
    // Fail open after 1.5s if the metadata endpoint is unavailable.
    return new Promise(function(resolve){
      var timer=setTimeout(resolve,1500);
      Promise.resolve(proof.state.ready).then(function(){clearTimeout(timer);resolve();},function(){clearTimeout(timer);resolve();});
    });
  }
  if(window.fetch){
    var originalFetch=window.fetch;
    window.fetch=function(input,options){
      var self=this,proof=pageViewTitle(input,options&&options.body);
      if(!proof)return originalFetch.apply(self,arguments);
      function send(){var request=proof.apply();return originalFetch.call(self,request.url,Object.assign({},options,{body:request.body}));}
      return proof.state.title?send():waitForTitle(proof).then(send);
    };
  }
  if(navigator.sendBeacon){
    var originalBeacon=navigator.sendBeacon;
    navigator.sendBeacon=function(input,body){
      var self=this,proof=pageViewTitle(input,body);
      if(!proof)return originalBeacon.apply(self,arguments);
      function send(){var request=proof.apply();return originalBeacon.call(self,request.url,request.body);}
      if(proof.state.title||document.visibilityState==='hidden')return send();
      waitForTitle(proof).then(send);
      return true;
    };
  }
`;
