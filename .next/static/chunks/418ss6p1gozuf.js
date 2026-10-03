(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33143,e=>{"use strict";e.i(12207);var t=e.i(8285),r=e.i(54479);e.i(74576);var i=e.i(56350),o=e.i(86259),n=e.i(27302),l=e.i(82283),s=e.i(58331);e.i(4041);var a=e.i(45975);e.i(62238);var c=t,h=e.i(20119);e.i(34051);var d=e.i(29389),u=e.i(1564),p=e.i(71080),g=e.i(49454),f=e.i(53157),m=e.i(21728);e.i(87789);var w=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let y=class extends c.LitElement{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=g.ConnectorController.state.connectors,this.count=o.ApiController.state.count,this.filteredCount=o.ApiController.state.filteredWallets.length,this.isFetchingRecommendedWallets=o.ApiController.state.isFetchingRecommendedWallets,this.unsubscribe.push(g.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),o.ApiController.subscribeKey("count",e=>this.count=e),o.ApiController.subscribeKey("filteredWallets",e=>this.filteredCount=e.length),o.ApiController.subscribeKey("isFetchingRecommendedWallets",e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.find(e=>"walletConnect"===e.id),{allWallets:t}=l.OptionsController.state;if(!e||"HIDE"===t||"ONLY_MOBILE"===t&&!n.CoreHelperUtil.isMobile())return null;let i=o.ApiController.state.featured.length,s=this.count+i,a=s<10?s:10*Math.floor(s/10),c=this.filteredCount>0?this.filteredCount:a,h=`${c}`;this.filteredCount>0?h=`${this.filteredCount}`:c<s&&(h=`${c}+`);let g=p.ConnectionController.hasAnyConnection(u.ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT);return r.html`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${h}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${(0,d.ifDefined)(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${g}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){f.EventsController.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),m.RouterController.push("AllWallets",{redirectView:m.RouterController.state.data?.redirectView})}};w([(0,h.property)()],y.prototype,"tabIdx",void 0),w([(0,i.state)()],y.prototype,"connectors",void 0),w([(0,i.state)()],y.prototype,"count",void 0),w([(0,i.state)()],y.prototype,"filteredCount",void 0),w([(0,i.state)()],y.prototype,"isFetchingRecommendedWallets",void 0),y=w([(0,a.customElement)("w3m-all-wallets-widget")],y);var b=t,v=e.i(41845),C=e.i(36220),x=e.i(60398),$=e.i(70850),E=e.i(69718),R=e.i(62611);let k=R.css`
  :host {
    margin-top: ${({spacing:e})=>e["1"]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e["3"]} calc(${({spacing:e})=>e["3"]} * -1)
      ${({spacing:e})=>e["2"]} calc(${({spacing:e})=>e["3"]} * -1);
    width: calc(100% + ${({spacing:e})=>e["3"]} * 2);
  }
`;var A=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let T=class extends b.LitElement{constructor(){super(),this.unsubscribe=[],this.explorerWallets=o.ApiController.state.explorerWallets,this.connections=p.ConnectionController.state.connections,this.connectorImages=v.AssetController.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(p.ConnectionController.subscribeKey("connections",e=>this.connections=e),v.AssetController.subscribeKey("connectorImages",e=>this.connectorImages=e),o.ApiController.subscribeKey("explorerFilteredWallets",e=>{this.explorerWallets=e?.length?e:o.ApiController.state.explorerWallets}),o.ApiController.subscribeKey("explorerWallets",e=>{this.explorerWallets?.length||(this.explorerWallets=e)})),n.CoreHelperUtil.isTelegram()&&n.CoreHelperUtil.isIos()&&(this.loadingTelegram=!p.ConnectionController.state.wcUri,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>this.loadingTelegram=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return r.html`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){return $.ConnectorUtil.connectorList().map((e,t)=>"connector"===e.kind?this.renderConnector(e,t):this.renderWallet(e,t))}getConnectorNamespaces(e){return"walletConnect"===e.subtype?[]:"multiChain"===e.subtype?e.connector.connectors?.map(e=>e.chain)||[]:[e.connector.chain]}renderConnector(e,t){let i,o,n=e.connector,l=C.AssetUtil.getConnectorImage(n)||this.connectorImages[n?.imageId??""],s=(this.connections.get(n.chain)??[]).some(e=>E.HelpersUtil.isLowerCaseMatch(e.connectorId,n.id));"walletConnect"===e.subtype?(i="qr code",o="accent"):"injected"===e.subtype||"announced"===e.subtype?(i=s?"connected":"installed",o=s?"info":"success"):(i=void 0,o=void 0);let a=p.ConnectionController.hasAnyConnection(u.ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT),c=("walletConnect"===e.subtype||"external"===e.subtype)&&a;return r.html`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${(0,d.ifDefined)(l)}
        .installed=${!0}
        name=${n.name??"Unknown"}
        .tagVariant=${o}
        tagLabel=${(0,d.ifDefined)(i)}
        data-testid=${`wallet-selector-${n.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(e)}
        tabIdx=${(0,d.ifDefined)(this.tabIdx)}
        ?disabled=${c}
        rdnsId=${(0,d.ifDefined)(n.explorerWallet?.rdns||void 0)}
        walletRank=${(0,d.ifDefined)(n.explorerWallet?.order)}
        .namespaces=${this.getConnectorNamespaces(e)}
      >
      </w3m-list-wallet>
    `}onClickConnector(e){let t=m.RouterController.state.data?.redirectView;if("walletConnect"===e.subtype){g.ConnectorController.setActiveConnector(e.connector),n.CoreHelperUtil.isMobile()?m.RouterController.push("AllWallets"):m.RouterController.push("ConnectingWalletConnect",{redirectView:t});return}if("multiChain"===e.subtype){g.ConnectorController.setActiveConnector(e.connector),m.RouterController.push("ConnectingMultiChain",{redirectView:t});return}if("injected"===e.subtype){g.ConnectorController.setActiveConnector(e.connector),m.RouterController.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}if("announced"===e.subtype)return"walletConnect"===e.connector.id?void(n.CoreHelperUtil.isMobile()?m.RouterController.push("AllWallets"):m.RouterController.push("ConnectingWalletConnect",{redirectView:t})):(m.RouterController.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet}),void 0);m.RouterController.push("ConnectingExternal",{connector:e.connector,redirectView:t})}renderWallet(e,t){let i=e.wallet,o=C.AssetUtil.getWalletImage(i),n=p.ConnectionController.hasAnyConnection(u.ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT),l=this.loadingTelegram,s="recent"===e.subtype?"recent":void 0,a="recent"===e.subtype?"info":void 0;return r.html`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${(0,d.ifDefined)(o)}
        name=${i.name??"Unknown"}
        @click=${()=>this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${i.id}`}
        tabIdx=${(0,d.ifDefined)(this.tabIdx)}
        ?loading=${l}
        ?disabled=${n}
        rdnsId=${(0,d.ifDefined)(i.rdns||void 0)}
        walletRank=${(0,d.ifDefined)(i.order)}
        tagLabel=${(0,d.ifDefined)(s)}
        .tagVariant=${a}
      >
      </w3m-list-wallet>
    `}onClickWallet(e){let t=m.RouterController.state.data?.redirectView,r=x.ChainController.state.activeChain;if("featured"===e.subtype)return void g.ConnectorController.selectWalletConnector(e.wallet);if("recent"===e.subtype){if(this.loadingTelegram)return;g.ConnectorController.selectWalletConnector(e.wallet);return}if("custom"===e.subtype){if(this.loadingTelegram)return;m.RouterController.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t});return}if(this.loadingTelegram)return;let i=r?g.ConnectorController.getConnector({id:e.wallet.id,namespace:r}):void 0;i?m.RouterController.push("ConnectingExternal",{connector:i,redirectView:t}):m.RouterController.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t})}};T.styles=k,A([(0,h.property)({type:Number})],T.prototype,"tabIdx",void 0),A([(0,i.state)()],T.prototype,"explorerWallets",void 0),A([(0,i.state)()],T.prototype,"connections",void 0),A([(0,i.state)()],T.prototype,"connectorImages",void 0),A([(0,i.state)()],T.prototype,"loadingTelegram",void 0),T=A([(0,a.customElement)("w3m-connector-list")],T);var S=t,P=e.i(83075),I=e.i(92279),L=e.i(11249),O=e.i(3468),U=e.i(11424),B=e.i(34523),j=t,N=t,D=e.i(59088),W=t;e.i(52634),e.i(39009);let M=R.css`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`;var _=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let z={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},H={lg:"md",md:"sm",sm:"sm"},F=class extends W.LitElement{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return r.html`
      <button data-active=${this.active}>
        ${this.icon?r.html`<wui-icon size=${H[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${z[this.size]}> ${this.label} </wui-text>
      </button>
    `}};F.styles=[D.resetStyles,D.elementStyles,M],_([(0,h.property)()],F.prototype,"icon",void 0),_([(0,h.property)()],F.prototype,"size",void 0),_([(0,h.property)()],F.prototype,"label",void 0),_([(0,h.property)({type:Boolean})],F.prototype,"active",void 0),F=_([(0,a.customElement)("wui-tab-item")],F);let q=R.css`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;var K=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let V=class extends N.LitElement{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,t)=>{let i=t===this.activeTab;return r.html`
        <wui-tab-item
          @click=${()=>this.onTabClick(t)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${i}
          data-active=${i}
          data-testid="tab-${e.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};V.styles=[D.resetStyles,D.elementStyles,q],K([(0,h.property)({type:Array})],V.prototype,"tabs",void 0),K([(0,h.property)()],V.prototype,"onTabChange",void 0),K([(0,h.property)()],V.prototype,"size",void 0),K([(0,i.state)()],V.prototype,"activeTab",void 0),V=K([(0,a.customElement)("wui-tabs")],V);var Y=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let J=class extends j.LitElement{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.generateTabs();return r.html`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){let e=this.platforms.map(e=>{if("browser"===e)return{label:"Browser",icon:"extension",platform:"browser"};if("mobile"===e)return{label:"Mobile",icon:"mobile",platform:"mobile"};if("qrcode"===e)return{label:"Mobile",icon:"mobile",platform:"qrcode"};if("web"===e)return{label:"Webapp",icon:"browser",platform:"web"};if("desktop"===e)return{label:"Desktop",icon:"desktop",platform:"desktop"};return{label:"Browser",icon:"extension",platform:"unsupported"}});return this.platformTabs=e.map(({platform:e})=>e),e}onTabChange(e){let t=this.platformTabs[e];t&&this.onSelectPlatfrom?.(t)}};Y([(0,h.property)({type:Array})],J.prototype,"platforms",void 0),Y([(0,h.property)()],J.prototype,"onSelectPlatfrom",void 0),J=Y([(0,a.customElement)("w3m-connecting-header")],J);var Q=t,G=e.i(39403);e.i(34420),e.i(43452),e.i(12190),e.i(10380);var X=t;let Z=R.css`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${e=>e.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var ee=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let et=class extends X.LitElement{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){let e=this.radius>50?50:this.radius,t=36-e;return r.html`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${e}
          stroke-dasharray="${116+t} ${245+t}"
          stroke-dashoffset=${360+1.75*t}
        />
      </svg>
    `}};et.styles=[D.resetStyles,Z],ee([(0,h.property)({type:Number})],et.prototype,"radius",void 0),et=ee([(0,a.customElement)("wui-loading-thumbnail")],et),e.i(49536),e.i(56303);var er=t,ei=e.i(12699),eo=t;e.i(73944),e.i(24947);let en=R.css`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;var el=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let es=class extends eo.LitElement{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return r.html`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};es.styles=[D.resetStyles,D.elementStyles,en],el([(0,h.property)({type:Boolean})],es.prototype,"disabled",void 0),el([(0,h.property)()],es.prototype,"label",void 0),el([(0,h.property)()],es.prototype,"buttonLabel",void 0),es=el([(0,a.customElement)("wui-cta-button")],es);let ea=R.css`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e["5"]} ${({spacing:e})=>e["5"]};
  }
`;var ec=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eh=class extends er.LitElement{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;let{name:e,app_store:t,play_store:i,chrome_store:o,homepage:l}=this.wallet,s=n.CoreHelperUtil.isMobile(),a=n.CoreHelperUtil.isIos(),c=n.CoreHelperUtil.isAndroid(),h=[t,i,l,o].filter(Boolean).length>1,d=ei.UiHelperUtil.getTruncateString({string:e,charsStart:12,charsEnd:0,truncate:"end"});return h&&!s?r.html`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${()=>m.RouterController.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!h&&l?r.html`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:t&&a?r.html`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:i&&c?r.html`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&n.CoreHelperUtil.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&n.CoreHelperUtil.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&n.CoreHelperUtil.openHref(this.wallet.homepage,"_blank")}};eh.styles=[ea],ec([(0,h.property)({type:Object})],eh.prototype,"wallet",void 0),eh=ec([(0,a.customElement)("w3m-mobile-download-links")],eh);let ed=R.css`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e["1"]} * -1);
    bottom: calc(${({spacing:e})=>e["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e["4"]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;var eu=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};class ep extends Q.LitElement{constructor(){super(),this.wallet=m.RouterController.state.data?.wallet,this.connector=m.RouterController.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=C.AssetUtil.getConnectorImage(this.connector)??C.AssetUtil.getWalletImage(this.wallet),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=p.ConnectionController.state.wcUri,this.error=p.ConnectionController.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>{this.uri=e,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),p.ConnectionController.subscribeKey("wcError",e=>this.error=e)),(n.CoreHelperUtil.isTelegram()||n.CoreHelperUtil.isSafari())&&n.CoreHelperUtil.isIos()&&p.ConnectionController.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),p.ConnectionController.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();let e=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel,t="";return this.label?t=this.label:(t=`Continue in ${this.name}`,this.error&&(t="Connection declined")),r.html`
      <wui-flex
        data-error=${(0,d.ifDefined)(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${(0,d.ifDefined)(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","0","0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?"error":"primary"}>
            ${t}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?r.html`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?r.html`
              <wui-flex .padding=${["0","5","5","5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){if(this.error&&!this.showRetry){this.showRetry=!0;let e=this.shadowRoot?.querySelector("wui-button");e?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"})}}onTryAgain(){p.ConnectionController.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){let e=G.ThemeController.state.themeVariables["--w3m-border-radius-master"],t=e?parseInt(e.replace("px",""),10):4;return r.html`<wui-loading-thumbnail radius=${9*t}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(n.CoreHelperUtil.copyToClopboard(this.uri),U.SnackController.showSuccess("Link copied"))}catch{U.SnackController.showError("Failed to copy")}}}ep.styles=ed,eu([(0,i.state)()],ep.prototype,"isRetrying",void 0),eu([(0,i.state)()],ep.prototype,"uri",void 0),eu([(0,i.state)()],ep.prototype,"error",void 0),eu([(0,i.state)()],ep.prototype,"ready",void 0),eu([(0,i.state)()],ep.prototype,"showRetry",void 0),eu([(0,i.state)()],ep.prototype,"label",void 0),eu([(0,i.state)()],ep.prototype,"secondaryBtnLabel",void 0),eu([(0,i.state)()],ep.prototype,"secondaryLabel",void 0),eu([(0,i.state)()],ep.prototype,"isLoading",void 0),eu([(0,h.property)({type:Boolean})],ep.prototype,"isMobile",void 0),eu([(0,h.property)()],ep.prototype,"onRetry",void 0);let eg=class extends ep{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),f.EventsController.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:m.RouterController.state.view}})}async onConnectProxy(){try{this.error=!1;let{connectors:e}=g.ConnectorController.state,t=e.find(e=>"ANNOUNCED"===e.type&&e.info?.rdns===this.wallet?.rdns||"INJECTED"===e.type||e.name===this.wallet?.name);if(t)await p.ConnectionController.connectExternal(t,t.chain);else throw Error("w3m-connecting-wc-browser: No connector found");O.ModalController.close()}catch(e){e instanceof I.AppKitError&&e.originalName===P.ErrorUtil.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?f.EventsController.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:e.message}}):f.EventsController.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),this.error=!0}}};eg=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,a.customElement)("w3m-connecting-wc-browser")],eg);let ef=class extends ep{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),f.EventsController.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:m.RouterController.state.view}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;let{desktop_link:e,name:t}=this.wallet,{redirect:r,href:i}=n.CoreHelperUtil.formatNativeUrl(e,this.uri);p.ConnectionController.setWcLinking({name:t,href:i}),p.ConnectionController.setRecentWallet(this.wallet),n.CoreHelperUtil.openHref(r,"_blank")}catch{this.error=!0}}};ef=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,a.customElement)("w3m-connecting-wc-desktop")],ef);var em=e.i(10087),ew=e.i(60334),ey=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eb=class extends ep{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=l.OptionsController.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{em.ConnectionControllerUtil.onConnectMobile(this.wallet)},!this.wallet)throw Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=ew.ConstantsUtil.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",()=>{this.onHandleURI()})),f.EventsController.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:m.RouterController.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){p.ConnectionController.setWcError(!1),this.onConnect?.()}};ey([(0,i.state)()],eb.prototype,"redirectDeeplink",void 0),ey([(0,i.state)()],eb.prototype,"redirectUniversalLink",void 0),ey([(0,i.state)()],eb.prototype,"target",void 0),ey([(0,i.state)()],eb.prototype,"preferUniversalLinks",void 0),ey([(0,i.state)()],eb.prototype,"isLoading",void 0),eb=ey([(0,a.customElement)("w3m-connecting-wc-mobile")],eb);var ev=t;e.i(64380);var eC=e.i(73134);function ex(e,t,r){return e!==t&&(e-t<0?t-e:e-t)<=r+.1}let e$={generate({uri:e,size:t,logoSize:i,padding:o=8,dotColor:n="var(--apkt-colors-black)"}){let l,s,a=[],c=(s=Math.sqrt((l=Array.prototype.slice.call(eC.default.create(e,{errorCorrectionLevel:"Q"}).modules.data,0)).length),l.reduce((e,t,r)=>(r%s==0?e.push([t]):e[e.length-1].push(t))&&e,[])),h=(t-2*o)/c.length,d=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];d.forEach(({x:e,y:t})=>{let i=(c.length-7)*h*e+o,l=(c.length-7)*h*t+o;for(let e=0;e<d.length;e+=1){let t=h*(7-2*e);a.push(r.svg`
            <rect
              fill=${2===e?"var(--apkt-colors-black)":"var(--apkt-colors-white)"}
              width=${0===e?t-10:t}
              rx= ${0===e?(t-10)*.45:.45*t}
              ry= ${0===e?(t-10)*.45:.45*t}
              stroke=${n}
              stroke-width=${10*(0===e)}
              height=${0===e?t-10:t}
              x= ${0===e?l+h*e+5:l+h*e}
              y= ${0===e?i+h*e+5:i+h*e}
            />
          `)}});let u=Math.floor((i+25)/h),p=c.length/2-u/2,g=c.length/2+u/2-1,f=[];c.forEach((e,t)=>{e.forEach((e,r)=>{!c[t][r]||t<7&&r<7||t>c.length-8&&r<7||t<7&&r>c.length-8||t>p&&t<g&&r>p&&r<g||f.push([t*h+h/2+o,r*h+h/2+o])})});let m={};return f.forEach(([e,t])=>{m[e]?m[e]?.push(t):m[e]=[t]}),Object.entries(m).map(([e,t])=>{let r=t.filter(e=>t.every(t=>!ex(e,t,h)));return[Number(e),r]}).forEach(([e,t])=>{t.forEach(t=>{a.push(r.svg`<circle cx=${e} cy=${t} fill=${n} r=${h/2.5} />`)})}),Object.entries(m).filter(([e,t])=>t.length>1).map(([e,t])=>{let r=t.filter(e=>t.some(t=>ex(e,t,h)));return[Number(e),r]}).map(([e,t])=>{t.sort((e,t)=>e<t?-1:1);let r=[];for(let e of t){let t=r.find(t=>t.some(t=>ex(e,t,h)));t?t.push(e):r.push([e])}return[e,r.map(e=>[e[0],e[e.length-1]])]}).forEach(([e,t])=>{t.forEach(([t,i])=>{a.push(r.svg`
              <line
                x1=${e}
                x2=${e}
                y1=${t}
                y2=${i}
                stroke=${n}
                stroke-width=${h/1.25}
                stroke-linecap="round"
              />
            `)})}),a}},eE=R.css`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({colors:e})=>e.white};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  :host {
    border-radius: ${({borderRadius:e})=>e[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`;var eR=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ek=class extends ev.LitElement{constructor(){super(...arguments),this.uri="",this.size=500,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),r.html`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return r.svg`
      <svg viewBox="0 0 ${this.size} ${this.size}" width="100%" height="100%">
        ${e$.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){return this.imageSrc?r.html`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?r.html`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:r.html`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};ek.styles=[D.resetStyles,eE],eR([(0,h.property)()],ek.prototype,"uri",void 0),eR([(0,h.property)({type:Number})],ek.prototype,"size",void 0),eR([(0,h.property)()],ek.prototype,"theme",void 0),eR([(0,h.property)()],ek.prototype,"imageSrc",void 0),eR([(0,h.property)()],ek.prototype,"alt",void 0),eR([(0,h.property)({type:Boolean})],ek.prototype,"arenaClear",void 0),eR([(0,h.property)({type:Boolean})],ek.prototype,"farcaster",void 0),ek=eR([(0,a.customElement)("wui-qr-code")],ek),e.i(80313),e.i(3596);let eA=R.css`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var eT=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eS=class extends ep{constructor(){super(),this.basic=!1}firstUpdated(){this.basic||f.EventsController.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:m.RouterController.state.view}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(e=>e())}render(){return this.onRenderProxy(),r.html`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","5","5","5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){if(!this.uri||!this.ready)return null;let e=this.wallet?this.wallet.name:void 0;p.ConnectionController.setWcLinking(void 0),p.ConnectionController.setRecentWallet(this.wallet);let t=G.ThemeController.state.themeVariables["--apkt-qr-color"]??G.ThemeController.state.themeVariables["--w3m-qr-color"];return r.html` <wui-qr-code
      theme=${G.ThemeController.state.themeMode}
      uri=${this.uri}
      imageSrc=${(0,d.ifDefined)(C.AssetUtil.getWalletImage(this.wallet))}
      color=${(0,d.ifDefined)(t)}
      alt=${(0,d.ifDefined)(e)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){let e=!this.uri||!this.ready;return r.html`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};eS.styles=eA,eT([(0,h.property)({type:Boolean})],eS.prototype,"basic",void 0),eS=eT([(0,a.customElement)("w3m-connecting-wc-qrcode")],eS);var eP=t;let eI=class extends eP.LitElement{constructor(){if(super(),this.wallet=m.RouterController.state.data?.wallet,!this.wallet)throw Error("w3m-connecting-wc-unsupported: No wallet provided");f.EventsController.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:m.RouterController.state.view}})}render(){return r.html`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${(0,d.ifDefined)(C.AssetUtil.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};eI=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,a.customElement)("w3m-connecting-wc-unsupported")],eI);var eL=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eO=class extends ep{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=ew.ConstantsUtil.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",()=>{this.updateLoadingState()})),f.EventsController.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:m.RouterController.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;let{webapp_link:e,name:t}=this.wallet,{redirect:r,href:i}=n.CoreHelperUtil.formatUniversalUrl(e,this.uri);p.ConnectionController.setWcLinking({name:t,href:i}),p.ConnectionController.setRecentWallet(this.wallet),n.CoreHelperUtil.openHref(r,"_blank")}catch{this.error=!0}}};eL([(0,i.state)()],eO.prototype,"isLoading",void 0),eO=eL([(0,a.customElement)("w3m-connecting-wc-web")],eO);let eU=R.css`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;var eB=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ej=class extends S.LitElement{constructor(){super(),this.wallet=m.RouterController.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!l.OptionsController.state.siwx,this.remoteFeatures=l.OptionsController.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(l.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l.OptionsController.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),r.html`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding&&this.displayBranding?r.html`<wui-ux-by-reown></wui-ux-by-reown>`:null}async initializeConnection(e=!1){if("browser"!==this.platform&&(!l.OptionsController.state.manualWCControl||e))try{let{wcPairingExpiry:t,status:r}=p.ConnectionController.state,{redirectView:i}=m.RouterController.state.data??{};if(e||l.OptionsController.state.enableEmbedded||n.CoreHelperUtil.isPairingExpired(t)||"connecting"===r){let e=p.ConnectionController.getConnections(x.ChainController.state.activeChain),t=this.remoteFeatures?.multiWallet,r=e.length>0;await p.ConnectionController.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(r&&t?(m.RouterController.replace("ProfileWallets"),U.SnackController.showSuccess("New Wallet Added")):i?m.RouterController.replace(i):O.ModalController.close())}}catch(e){if(e instanceof Error&&e.message.includes("An error occurred when attempting to switch chain")&&!l.OptionsController.state.enableNetworkSwitch&&x.ChainController.state.activeChain){x.ChainController.setActiveCaipNetwork(B.CaipNetworksUtil.getUnsupportedNetwork(`${x.ChainController.state.activeChain}:${x.ChainController.state.activeCaipNetwork?.id}`)),x.ChainController.showUnsupportedChainUI();return}e instanceof I.AppKitError&&e.originalName===P.ErrorUtil.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?f.EventsController.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:e.message}}):f.EventsController.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),p.ConnectionController.setWcError(!0),U.SnackController.showError(e.message??"Connection error"),p.ConnectionController.resetWcConnection(),m.RouterController.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;let{mobile_link:e,desktop_link:t,webapp_link:r,injected:i,rdns:o}=this.wallet,s=i?.map(({injected_id:e})=>e).filter(Boolean),a=[...o?[o]:s??[]],c=!l.OptionsController.state.isUniversalProvider&&a.length,h=p.ConnectionController.checkInstalled(a),d=c&&h,u=t&&!n.CoreHelperUtil.isMobile();d&&!x.ChainController.state.noAdapters&&this.platforms.push("browser"),e&&this.platforms.push(n.CoreHelperUtil.isMobile()?"mobile":"qrcode"),r&&this.platforms.push("web"),u&&this.platforms.push("desktop");let g=L.MobileWalletUtil.isCustomDeeplinkWallet(this.wallet.id,x.ChainController.state.activeChain);d||!c||x.ChainController.state.noAdapters||g||this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return r.html`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return r.html`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return r.html`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return r.html`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return r.html`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return r.html`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?r.html`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(e){let t=this.shadowRoot?.querySelector("div");t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=e,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};ej.styles=eU,eB([(0,i.state)()],ej.prototype,"platform",void 0),eB([(0,i.state)()],ej.prototype,"platforms",void 0),eB([(0,i.state)()],ej.prototype,"isSiwxEnabled",void 0),eB([(0,i.state)()],ej.prototype,"remoteFeatures",void 0),eB([(0,h.property)({type:Boolean})],ej.prototype,"displayBranding",void 0),eB([(0,h.property)({type:Boolean})],ej.prototype,"basic",void 0),ej=eB([(0,a.customElement)("w3m-connecting-wc-view")],ej);var eN=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eD=class extends t.LitElement{constructor(){super(),this.unsubscribe=[],this.isMobile=n.CoreHelperUtil.isMobile(),this.remoteFeatures=l.OptionsController.state.remoteFeatures,this.unsubscribe.push(l.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){let{featured:e,recommended:t}=o.ApiController.state,{customWallets:i}=l.OptionsController.state,n=s.StorageUtil.getRecentWallets(),a=e.length||t.length||i?.length||n.length;return r.html`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${a?r.html`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return r.html`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?r.html` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};eN([(0,i.state)()],eD.prototype,"isMobile",void 0),eN([(0,i.state)()],eD.prototype,"remoteFeatures",void 0),eD=eN([(0,a.customElement)("w3m-connecting-wc-basic-view")],eD),e.s(["W3mConnectingWcBasicView",0,eD],12639);var eW=t,eM=t,e_=t;let{I:ez}=r._$LH;var eH=e.i(91909);let eF=(e,t)=>{let r=e._$AN;if(void 0===r)return!1;for(let e of r)e._$AO?.(t,!1),eF(e,t);return!0},eq=e=>{let t,r;do{if(void 0===(t=e._$AM))break;(r=t._$AN).delete(e),e=t}while(0===r?.size)},eK=e=>{for(let t;t=e._$AM;e=t){let r=t._$AN;if(void 0===r)t._$AN=r=new Set;else if(r.has(e))break;r.add(e),eJ(t)}};function eV(e){void 0!==this._$AN?(eq(this),this._$AM=e,eK(this)):this._$AM=e}function eY(e,t=!1,r=0){let i=this._$AH,o=this._$AN;if(void 0!==o&&0!==o.size)if(t)if(Array.isArray(i))for(let e=r;e<i.length;e++)eF(i[e],!1),eq(i[e]);else null!=i&&(eF(i,!1),eq(i));else eF(this,e)}let eJ=e=>{e.type==eH.PartType.CHILD&&(e._$AP??=eY,e._$AQ??=eV)};class eQ extends eH.Directive{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,t,r){super._$AT(e,t,r),eK(this),this.isConnected=e._$AU}_$AO(e,t=!0){e!==this.isConnected&&(this.isConnected=e,e?this.reconnected?.():this.disconnected?.()),t&&(eF(this,e),eq(this))}setValue(e){if(void 0===this._$Ct.strings)this._$Ct._$AI(e,this);else{let t=[...this._$Ct._$AH];t[this._$Ci]=e,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}}let eG=()=>new eX;class eX{}let eZ=new WeakMap,e0=(0,eH.directive)(class extends eQ{render(e){return r.nothing}update(e,[t]){let i=t!==this.G;return i&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),r.nothing}rt(e){if(void 0!==this.G)if(this.isConnected||(e=void 0),"function"==typeof this.G){let t=this.ht??globalThis,r=eZ.get(t);void 0===r&&(r=new WeakMap,eZ.set(t,r)),void 0!==r.get(this.G)&&this.G.call(this.ht,void 0),r.set(this.G,e),void 0!==e&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return"function"==typeof this.G?eZ.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),e1=R.css`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`;var e3=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let e2=class extends e_.LitElement{constructor(){super(...arguments),this.inputElementRef=eG(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return r.html`
      <label data-size=${this.size}>
        <input
          ${e0(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};e2.styles=[D.resetStyles,D.elementStyles,e1],e3([(0,h.property)({type:Boolean})],e2.prototype,"checked",void 0),e3([(0,h.property)({type:Boolean})],e2.prototype,"disabled",void 0),e3([(0,h.property)()],e2.prototype,"size",void 0),e2=e3([(0,a.customElement)("wui-toggle")],e2);let e5=R.css`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e["2"]};
    padding: ${({spacing:e})=>e["2"]} ${({spacing:e})=>e["3"]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e["4"]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var e4=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let e8=class extends eM.LitElement{constructor(){super(...arguments),this.checked=!1}render(){return r.html`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};e8.styles=[D.resetStyles,D.elementStyles,e5],e4([(0,h.property)({type:Boolean})],e8.prototype,"checked",void 0),e8=e4([(0,a.customElement)("wui-certified-switch")],e8);var e6=t,e7=t;let e9=R.css`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;var te=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tt=class extends e7.LitElement{constructor(){super(...arguments),this.inputElementRef=eG(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return r.html` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${e0(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${(0,d.ifDefined)(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?r.html`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){return this.onSubmit?r.html`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?r.html`<wui-icon name="spinner" size="md"></wui-icon>`:r.html`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?r.html`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?r.html`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};tt.styles=[D.resetStyles,D.elementStyles,e9],te([(0,h.property)()],tt.prototype,"icon",void 0),te([(0,h.property)({type:Boolean})],tt.prototype,"disabled",void 0),te([(0,h.property)({type:Boolean})],tt.prototype,"loading",void 0),te([(0,h.property)()],tt.prototype,"placeholder",void 0),te([(0,h.property)()],tt.prototype,"type",void 0),te([(0,h.property)()],tt.prototype,"value",void 0),te([(0,h.property)()],tt.prototype,"errorText",void 0),te([(0,h.property)()],tt.prototype,"warningText",void 0),te([(0,h.property)()],tt.prototype,"onSubmit",void 0),te([(0,h.property)()],tt.prototype,"size",void 0),te([(0,h.property)({attribute:!1})],tt.prototype,"onKeyDown",void 0),tt=te([(0,a.customElement)("wui-input-text")],tt);let tr=R.css`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`;var ti=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let to=class extends e6.LitElement{constructor(){super(...arguments),this.inputComponentRef=eG(),this.inputValue=""}render(){return r.html`
      <wui-input-text
        ${e0(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?r.html`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(e){this.inputValue=e.detail||""}clearValue(){let e=this.inputComponentRef.value,t=e?.inputElementRef.value;t&&(t.value="",this.inputValue="",t.focus(),t.dispatchEvent(new Event("input")))}};to.styles=[D.resetStyles,tr],ti([(0,h.property)()],to.prototype,"inputValue",void 0),to=ti([(0,a.customElement)("wui-search-bar")],to);var tn=t,tl=e.i(97730),ts=t,ta=e.i(52157);e.i(64576);let tc=R.css`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var th=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let td=class extends ts.LitElement{constructor(){super(...arguments),this.type="wallet"}render(){return r.html`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return"network"===this.type?r.html` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${ta.networkSvgMd}`:r.html`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};td.styles=[D.resetStyles,D.elementStyles,tc],th([(0,h.property)()],td.prototype,"type",void 0),td=th([(0,a.customElement)("wui-card-select-loader")],td);var tu=t,tp=e.i(15193);let tg=tp.css`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var tf=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tm=class extends tu.LitElement{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&ei.UiHelperUtil.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&ei.UiHelperUtil.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&ei.UiHelperUtil.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&ei.UiHelperUtil.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&ei.UiHelperUtil.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&ei.UiHelperUtil.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&ei.UiHelperUtil.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&ei.UiHelperUtil.getSpacingStyles(this.margin,3)};
    `,r.html`<slot></slot>`}};tm.styles=[D.resetStyles,tg],tf([(0,h.property)()],tm.prototype,"gridTemplateRows",void 0),tf([(0,h.property)()],tm.prototype,"gridTemplateColumns",void 0),tf([(0,h.property)()],tm.prototype,"justifyItems",void 0),tf([(0,h.property)()],tm.prototype,"alignItems",void 0),tf([(0,h.property)()],tm.prototype,"justifyContent",void 0),tf([(0,h.property)()],tm.prototype,"alignContent",void 0),tf([(0,h.property)()],tm.prototype,"columnGap",void 0),tf([(0,h.property)()],tm.prototype,"rowGap",void 0),tf([(0,h.property)()],tm.prototype,"gap",void 0),tf([(0,h.property)()],tm.prototype,"padding",void 0),tf([(0,h.property)()],tm.prototype,"margin",void 0),tm=tf([(0,a.customElement)("wui-grid")],tm);var tw=t;let ty=R.css`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e["2"]};
    padding: ${({spacing:e})=>e["3"]} ${({spacing:e})=>e["0"]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e["4"]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var tb=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tv=class extends tw.LitElement{constructor(){super(),this.observer=new IntersectionObserver(()=>void 0),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){let e=this.wallet?.badge_type==="certified";return r.html`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${(0,d.ifDefined)(e?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${e?r.html`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return(this.visible||this.imageSrc)&&!this.imageLoading?r.html`
      <wui-wallet-image
        size="lg"
        imageSrc=${(0,d.ifDefined)(this.imageSrc)}
        name=${(0,d.ifDefined)(this.wallet?.name)}
        .installed=${this.wallet?.installed??!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `:this.shimmerTemplate()}shimmerTemplate(){return r.html`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){!this.wallet||(this.imageSrc=C.AssetUtil.getWalletImage(this.wallet),this.imageSrc||(this.imageLoading=!0,this.imageSrc=await C.AssetUtil.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){this.wallet&&!this.isImpressed&&(this.isImpressed=!0,f.EventsController.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:m.RouterController.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};tv.styles=ty,tb([(0,i.state)()],tv.prototype,"visible",void 0),tb([(0,i.state)()],tv.prototype,"imageSrc",void 0),tb([(0,i.state)()],tv.prototype,"imageLoading",void 0),tb([(0,i.state)()],tv.prototype,"isImpressed",void 0),tb([(0,h.property)()],tv.prototype,"explorerId",void 0),tb([(0,h.property)()],tv.prototype,"walletQuery",void 0),tb([(0,h.property)()],tv.prototype,"certified",void 0),tb([(0,h.property)()],tv.prototype,"displayIndex",void 0),tb([(0,h.property)({type:Object})],tv.prototype,"wallet",void 0),tv=tb([(0,a.customElement)("w3m-all-wallets-list-item")],tv);let tC=R.css`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:e})=>e["4"]};
    padding-bottom: ${({spacing:e})=>e["4"]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var tx=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let t$="local-paginator",tE=class extends tn.LitElement{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!o.ApiController.state.wallets.length,this.wallets=o.ApiController.state.wallets,this.mobileFullScreen=l.OptionsController.state.enableMobileFullScreen,this.unsubscribe.push(o.ApiController.subscribeKey("wallets",e=>this.wallets=e))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.paginationObserver?.disconnect()}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),r.html`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;let e=this.shadowRoot?.querySelector("wui-grid");e&&(await o.ApiController.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(e,t){return[...Array(e)].map(()=>r.html`
        <wui-card-select-loader type="wallet" id=${(0,d.ifDefined)(t)}></wui-card-select-loader>
      `)}walletsTemplate(){return tl.WalletUtil.getWalletConnectWallets(this.wallets).map((e,t)=>r.html`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
          explorerId=${e.id}
          certified=${"certified"===this.badge}
          displayIndex=${t}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){let{wallets:e,recommended:t,featured:r,count:i,mobileFilteredOutWalletsLength:n}=o.ApiController.state,l=window.innerWidth<352?3:4,s=e.length+t.length,a=Math.ceil(s/l)*l-s+l;return(a-=e.length?r.length%l:0,0===i&&r.length>0)?null:0===i||[...r,...e,...t].length<i-(n??0)?this.shimmerTemplate(a,t$):null}createPaginationObserver(){let e=this.shadowRoot?.querySelector(`#${t$}`);e&&(this.paginationObserver=new IntersectionObserver(([e])=>{if(e?.isIntersecting&&!this.loading){let{page:e,count:t,wallets:r}=o.ApiController.state;r.length<t&&o.ApiController.fetchWalletsByPage({page:e+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){g.ConnectorController.selectWalletConnector(e)}};tE.styles=tC,tx([(0,i.state)()],tE.prototype,"loading",void 0),tx([(0,i.state)()],tE.prototype,"wallets",void 0),tx([(0,i.state)()],tE.prototype,"badge",void 0),tx([(0,i.state)()],tE.prototype,"mobileFullScreen",void 0),tE=tx([(0,a.customElement)("w3m-all-wallets-list")],tE);var tR=t;e.i(21147);let tk=tp.css`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;var tA=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tT=class extends tR.LitElement{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=l.OptionsController.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?r.html`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await o.ApiController.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){let{search:e}=o.ApiController.state,t=tl.WalletUtil.markWalletsAsInstalled(e),i=tl.WalletUtil.filterWalletsByWcSupport(t);return i.length?r.html`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${i.map((e,t)=>r.html`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(e)}
              .wallet=${e}
              data-testid="wallet-search-item-${e.id}"
              explorerId=${e.id}
              certified=${"certified"===this.badge}
              walletQuery=${this.query}
              displayIndex=${t}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:r.html`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(e){g.ConnectorController.selectWalletConnector(e)}};tT.styles=tk,tA([(0,i.state)()],tT.prototype,"loading",void 0),tA([(0,i.state)()],tT.prototype,"mobileFullScreen",void 0),tA([(0,h.property)()],tT.prototype,"query",void 0),tA([(0,h.property)()],tT.prototype,"badge",void 0),tT=tA([(0,a.customElement)("w3m-all-wallets-search")],tT);var tS=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tP=class extends eW.LitElement{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=n.CoreHelperUtil.debounce(e=>{this.search=e})}render(){let e=this.search.length>=2;return r.html`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${"certified"===this.badge}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${e||this.badge?r.html`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:r.html`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge="certified",U.SnackController.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return n.CoreHelperUtil.isMobile()?r.html`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){m.RouterController.push("ConnectingWalletConnect")}};tS([(0,i.state)()],tP.prototype,"search",void 0),tS([(0,i.state)()],tP.prototype,"badge",void 0),tP=tS([(0,a.customElement)("w3m-all-wallets-view")],tP),e.s(["W3mAllWalletsView",0,tP],10149);var tI=t;e.i(43053);let tL=class extends tI.LitElement{constructor(){super(...arguments),this.wallet=m.RouterController.state.data?.wallet}render(){if(!this.wallet)throw Error("w3m-downloads-view");return r.html`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?r.html`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?r.html`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?r.html`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?r.html`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(e){e.href&&this.wallet&&(f.EventsController.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:e.type}}),n.CoreHelperUtil.openHref(e.href,"_blank"))}onChromeStore(){this.wallet?.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){this.wallet?.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){this.wallet?.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){this.wallet?.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};tL=function(e,t,r,i){var o,n=arguments.length,l=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(l=(n<3?o(l):n>3?o(t,r,l):o(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,a.customElement)("w3m-downloads-view")],tL),e.s(["W3mDownloadsView",0,tL],8201),e.s([],19152),e.i(19152),e.i(12639),e.i(10149),e.i(8201),e.s(["W3mAllWalletsView",0,tP,"W3mConnectingWcBasicView",0,eD,"W3mDownloadsView",0,tL],33143)},38750,(e,t,r)=>{t.exports=function(){return"function"==typeof Promise&&Promise.prototype&&Promise.prototype.then}},87201,(e,t,r)=>{let i,o=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];r.getSymbolSize=function(e){if(!e)throw Error('"version" cannot be null or undefined');if(e<1||e>40)throw Error('"version" should be in range from 1 to 40');return 4*e+17},r.getSymbolTotalCodewords=function(e){return o[e]},r.getBCHDigit=function(e){let t=0;for(;0!==e;)t++,e>>>=1;return t},r.setToSJISFunction=function(e){if("function"!=typeof e)throw Error('"toSJISFunc" is not a valid function.');i=e},r.isKanjiModeEnabled=function(){return void 0!==i},r.toSJIS=function(e){return i(e)}},73133,(e,t,r)=>{r.L={bit:1},r.M={bit:0},r.Q={bit:3},r.H={bit:2},r.isValid=function(e){return e&&void 0!==e.bit&&e.bit>=0&&e.bit<4},r.from=function(e,t){if(r.isValid(e))return e;try{if("string"!=typeof e)throw Error("Param is not a string");switch(e.toLowerCase()){case"l":case"low":return r.L;case"m":case"medium":return r.M;case"q":case"quartile":return r.Q;case"h":case"high":return r.H;default:throw Error("Unknown EC Level: "+e)}}catch(e){return t}}},73666,(e,t,r)=>{function i(){this.buffer=[],this.length=0}i.prototype={get:function(e){let t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)==1},put:function(e,t){for(let r=0;r<t;r++)this.putBit((e>>>t-r-1&1)==1)},getLengthInBits:function(){return this.length},putBit:function(e){let t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}},t.exports=i},11421,(e,t,r)=>{function i(e){if(!e||e<1)throw Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}i.prototype.set=function(e,t,r,i){let o=e*this.size+t;this.data[o]=r,i&&(this.reservedBit[o]=!0)},i.prototype.get=function(e,t){return this.data[e*this.size+t]},i.prototype.xor=function(e,t,r){this.data[e*this.size+t]^=r},i.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]},t.exports=i},20637,(e,t,r)=>{let i=e.r(87201).getSymbolSize;r.getRowColCoords=function(e){if(1===e)return[];let t=Math.floor(e/7)+2,r=i(e),o=145===r?26:2*Math.ceil((r-13)/(2*t-2)),n=[r-7];for(let e=1;e<t-1;e++)n[e]=n[e-1]-o;return n.push(6),n.reverse()},r.getPositions=function(e){let t=[],i=r.getRowColCoords(e),o=i.length;for(let e=0;e<o;e++)for(let r=0;r<o;r++)(0!==e||0!==r)&&(0!==e||r!==o-1)&&(e!==o-1||0!==r)&&t.push([i[e],i[r]]);return t}},14002,(e,t,r)=>{let i=e.r(87201).getSymbolSize;r.getPositions=function(e){let t=i(e);return[[0,0],[t-7,0],[0,t-7]]}},37692,(e,t,r)=>{r.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};r.isValid=function(e){return null!=e&&""!==e&&!isNaN(e)&&e>=0&&e<=7},r.from=function(e){return r.isValid(e)?parseInt(e,10):void 0},r.getPenaltyN1=function(e){let t=e.size,r=0,i=0,o=0,n=null,l=null;for(let s=0;s<t;s++){i=o=0,n=l=null;for(let a=0;a<t;a++){let t=e.get(s,a);t===n?i++:(i>=5&&(r+=3+(i-5)),n=t,i=1),(t=e.get(a,s))===l?o++:(o>=5&&(r+=3+(o-5)),l=t,o=1)}i>=5&&(r+=3+(i-5)),o>=5&&(r+=3+(o-5))}return r},r.getPenaltyN2=function(e){let t=e.size,r=0;for(let i=0;i<t-1;i++)for(let o=0;o<t-1;o++){let t=e.get(i,o)+e.get(i,o+1)+e.get(i+1,o)+e.get(i+1,o+1);(4===t||0===t)&&r++}return 3*r},r.getPenaltyN3=function(e){let t=e.size,r=0,i=0,o=0;for(let n=0;n<t;n++){i=o=0;for(let l=0;l<t;l++)i=i<<1&2047|e.get(n,l),l>=10&&(1488===i||93===i)&&r++,o=o<<1&2047|e.get(l,n),l>=10&&(1488===o||93===o)&&r++}return 40*r},r.getPenaltyN4=function(e){let t=0,r=e.data.length;for(let i=0;i<r;i++)t+=e.data[i];return 10*Math.abs(Math.ceil(100*t/r/5)-10)},r.applyMask=function(e,t){let i=t.size;for(let o=0;o<i;o++)for(let n=0;n<i;n++)t.isReserved(n,o)||t.xor(n,o,function(e,t,i){switch(e){case r.Patterns.PATTERN000:return(t+i)%2==0;case r.Patterns.PATTERN001:return t%2==0;case r.Patterns.PATTERN010:return i%3==0;case r.Patterns.PATTERN011:return(t+i)%3==0;case r.Patterns.PATTERN100:return(Math.floor(t/2)+Math.floor(i/3))%2==0;case r.Patterns.PATTERN101:return t*i%2+t*i%3==0;case r.Patterns.PATTERN110:return(t*i%2+t*i%3)%2==0;case r.Patterns.PATTERN111:return(t*i%3+(t+i)%2)%2==0;default:throw Error("bad maskPattern:"+e)}}(e,n,o))},r.getBestMask=function(e,t){let i=Object.keys(r.Patterns).length,o=0,n=1/0;for(let l=0;l<i;l++){t(l),r.applyMask(l,e);let i=r.getPenaltyN1(e)+r.getPenaltyN2(e)+r.getPenaltyN3(e)+r.getPenaltyN4(e);r.applyMask(l,e),i<n&&(n=i,o=l)}return o}},48125,(e,t,r)=>{let i=e.r(73133),o=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],n=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];r.getBlocksCount=function(e,t){switch(t){case i.L:return o[(e-1)*4+0];case i.M:return o[(e-1)*4+1];case i.Q:return o[(e-1)*4+2];case i.H:return o[(e-1)*4+3];default:return}},r.getTotalCodewordsCount=function(e,t){switch(t){case i.L:return n[(e-1)*4+0];case i.M:return n[(e-1)*4+1];case i.Q:return n[(e-1)*4+2];case i.H:return n[(e-1)*4+3];default:return}}},54232,(e,t,r)=>{let i=new Uint8Array(512),o=new Uint8Array(256),n=1;for(let e=0;e<255;e++)i[e]=n,o[n]=e,256&(n<<=1)&&(n^=285);for(let e=255;e<512;e++)i[e]=i[e-255];r.log=function(e){if(e<1)throw Error("log("+e+")");return o[e]},r.exp=function(e){return i[e]},r.mul=function(e,t){return 0===e||0===t?0:i[o[e]+o[t]]}},50677,(e,t,r)=>{let i=e.r(54232);r.mul=function(e,t){let r=new Uint8Array(e.length+t.length-1);for(let o=0;o<e.length;o++)for(let n=0;n<t.length;n++)r[o+n]^=i.mul(e[o],t[n]);return r},r.mod=function(e,t){let r=new Uint8Array(e);for(;r.length-t.length>=0;){let e=r[0];for(let o=0;o<t.length;o++)r[o]^=i.mul(t[o],e);let o=0;for(;o<r.length&&0===r[o];)o++;r=r.slice(o)}return r},r.generateECPolynomial=function(e){let t=new Uint8Array([1]);for(let o=0;o<e;o++)t=r.mul(t,new Uint8Array([1,i.exp(o)]));return t}},62458,(e,t,r)=>{let i=e.r(50677);function o(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}o.prototype.initialize=function(e){this.degree=e,this.genPoly=i.generateECPolynomial(this.degree)},o.prototype.encode=function(e){if(!this.genPoly)throw Error("Encoder not initialized");let t=new Uint8Array(e.length+this.degree);t.set(e);let r=i.mod(t,this.genPoly),o=this.degree-r.length;if(o>0){let e=new Uint8Array(this.degree);return e.set(r,o),e}return r},t.exports=o},67483,(e,t,r)=>{r.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40}},96592,(e,t,r)=>{let i="[0-9]+",o="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+",n="(?:(?![A-Z0-9 $%*+\\-./:]|"+(o=o.replace(/u/g,"\\u"))+")(?:.|[\r\n]))+";r.KANJI=RegExp(o,"g"),r.BYTE_KANJI=RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),r.BYTE=RegExp(n,"g"),r.NUMERIC=RegExp(i,"g"),r.ALPHANUMERIC=RegExp("[A-Z $%*+\\-./:]+","g");let l=RegExp("^"+o+"$"),s=RegExp("^"+i+"$"),a=RegExp("^[A-Z0-9 $%*+\\-./:]+$");r.testKanji=function(e){return l.test(e)},r.testNumeric=function(e){return s.test(e)},r.testAlphanumeric=function(e){return a.test(e)}},50882,(e,t,r)=>{let i=e.r(67483),o=e.r(96592);r.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},r.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},r.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},r.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},r.MIXED={bit:-1},r.getCharCountIndicator=function(e,t){if(!e.ccBits)throw Error("Invalid mode: "+e);if(!i.isValid(t))throw Error("Invalid version: "+t);return t>=1&&t<10?e.ccBits[0]:t<27?e.ccBits[1]:e.ccBits[2]},r.getBestModeForData=function(e){return o.testNumeric(e)?r.NUMERIC:o.testAlphanumeric(e)?r.ALPHANUMERIC:o.testKanji(e)?r.KANJI:r.BYTE},r.toString=function(e){if(e&&e.id)return e.id;throw Error("Invalid mode")},r.isValid=function(e){return e&&e.bit&&e.ccBits},r.from=function(e,t){if(r.isValid(e))return e;try{if("string"!=typeof e)throw Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return r.NUMERIC;case"alphanumeric":return r.ALPHANUMERIC;case"kanji":return r.KANJI;case"byte":return r.BYTE;default:throw Error("Unknown mode: "+e)}}catch(e){return t}}},93547,(e,t,r)=>{let i=e.r(87201),o=e.r(48125),n=e.r(73133),l=e.r(50882),s=e.r(67483),a=i.getBCHDigit(7973);function c(e,t){return l.getCharCountIndicator(e,t)+4}r.from=function(e,t){return s.isValid(e)?parseInt(e,10):t},r.getCapacity=function(e,t,r){if(!s.isValid(e))throw Error("Invalid QR Code version");void 0===r&&(r=l.BYTE);let n=(i.getSymbolTotalCodewords(e)-o.getTotalCodewordsCount(e,t))*8;if(r===l.MIXED)return n;let a=n-c(r,e);switch(r){case l.NUMERIC:return Math.floor(a/10*3);case l.ALPHANUMERIC:return Math.floor(a/11*2);case l.KANJI:return Math.floor(a/13);case l.BYTE:default:return Math.floor(a/8)}},r.getBestVersionForData=function(e,t){let i,o=n.from(t,n.M);if(Array.isArray(e)){if(e.length>1){for(let t=1;t<=40;t++)if(function(e,t){let r=0;return e.forEach(function(e){let i=c(e.mode,t);r+=i+e.getBitsLength()}),r}(e,t)<=r.getCapacity(t,o,l.MIXED))return t;return}if(0===e.length)return 1;i=e[0]}else i=e;return function(e,t,i){for(let o=1;o<=40;o++)if(t<=r.getCapacity(o,i,e))return o}(i.mode,i.getLength(),o)},r.getEncodedBits=function(e){if(!s.isValid(e)||e<7)throw Error("Invalid QR Code version");let t=e<<12;for(;i.getBCHDigit(t)-a>=0;)t^=7973<<i.getBCHDigit(t)-a;return e<<12|t}},57655,(e,t,r)=>{let i=e.r(87201),o=i.getBCHDigit(1335);r.getEncodedBits=function(e,t){let r=e.bit<<3|t,n=r<<10;for(;i.getBCHDigit(n)-o>=0;)n^=1335<<i.getBCHDigit(n)-o;return(r<<10|n)^21522}},94097,(e,t,r)=>{let i=e.r(50882);function o(e){this.mode=i.NUMERIC,this.data=e.toString()}o.getBitsLength=function(e){return 10*Math.floor(e/3)+(e%3?e%3*3+1:0)},o.prototype.getLength=function(){return this.data.length},o.prototype.getBitsLength=function(){return o.getBitsLength(this.data.length)},o.prototype.write=function(e){let t,r;for(t=0;t+3<=this.data.length;t+=3)r=parseInt(this.data.substr(t,3),10),e.put(r,10);let i=this.data.length-t;i>0&&(r=parseInt(this.data.substr(t),10),e.put(r,3*i+1))},t.exports=o},12553,(e,t,r)=>{let i=e.r(50882),o=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(e){this.mode=i.ALPHANUMERIC,this.data=e}n.getBitsLength=function(e){return 11*Math.floor(e/2)+e%2*6},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let t;for(t=0;t+2<=this.data.length;t+=2){let r=45*o.indexOf(this.data[t]);r+=o.indexOf(this.data[t+1]),e.put(r,11)}this.data.length%2&&e.put(o.indexOf(this.data[t]),6)},t.exports=n},84770,(e,t,r)=>{"use strict";t.exports=function(e){for(var t=[],r=e.length,i=0;i<r;i++){var o=e.charCodeAt(i);if(o>=55296&&o<=56319&&r>i+1){var n=e.charCodeAt(i+1);n>=56320&&n<=57343&&(o=(o-55296)*1024+n-56320+65536,i+=1)}if(o<128){t.push(o);continue}if(o<2048){t.push(o>>6|192),t.push(63&o|128);continue}if(o<55296||o>=57344&&o<65536){t.push(o>>12|224),t.push(o>>6&63|128),t.push(63&o|128);continue}if(o>=65536&&o<=1114111){t.push(o>>18|240),t.push(o>>12&63|128),t.push(o>>6&63|128),t.push(63&o|128);continue}t.push(239,191,189)}return new Uint8Array(t).buffer}},82257,(e,t,r)=>{let i=e.r(84770),o=e.r(50882);function n(e){this.mode=o.BYTE,"string"==typeof e&&(e=i(e)),this.data=new Uint8Array(e)}n.getBitsLength=function(e){return 8*e},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){for(let t=0,r=this.data.length;t<r;t++)e.put(this.data[t],8)},t.exports=n},22644,(e,t,r)=>{let i=e.r(50882),o=e.r(87201);function n(e){this.mode=i.KANJI,this.data=e}n.getBitsLength=function(e){return 13*e},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let r=o.toSJIS(this.data[t]);if(r>=33088&&r<=40956)r-=33088;else if(r>=57408&&r<=60351)r-=49472;else throw Error("Invalid SJIS character: "+this.data[t]+"\nMake sure your charset is UTF-8");r=(r>>>8&255)*192+(255&r),e.put(r,13)}},t.exports=n},45953,(e,t,r)=>{"use strict";var i={single_source_shortest_paths:function(e,t,r){var o,n,l,s,a,c,h,d={},u={};u[t]=0;var p=i.PriorityQueue.make();for(p.push(t,0);!p.empty();)for(l in n=(o=p.pop()).value,s=o.cost,a=e[n]||{})a.hasOwnProperty(l)&&(c=s+a[l],h=u[l],(void 0===u[l]||h>c)&&(u[l]=c,p.push(l,c),d[l]=n));if(void 0!==r&&void 0===u[r])throw Error(["Could not find a path from ",t," to ",r,"."].join(""));return d},extract_shortest_path_from_predecessor_list:function(e,t){for(var r=[],i=t;i;)r.push(i),e[i],i=e[i];return r.reverse(),r},find_path:function(e,t,r){var o=i.single_source_shortest_paths(e,t,r);return i.extract_shortest_path_from_predecessor_list(o,r)},PriorityQueue:{make:function(e){var t,r=i.PriorityQueue,o={};for(t in e=e||{},r)r.hasOwnProperty(t)&&(o[t]=r[t]);return o.queue=[],o.sorter=e.sorter||r.default_sorter,o},default_sorter:function(e,t){return e.cost-t.cost},push:function(e,t){this.queue.push({value:e,cost:t}),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return 0===this.queue.length}}};t.exports=i},97930,(e,t,r)=>{let i=e.r(50882),o=e.r(94097),n=e.r(12553),l=e.r(82257),s=e.r(22644),a=e.r(96592),c=e.r(87201),h=e.r(45953);function d(e){return unescape(encodeURIComponent(e)).length}function u(e,t,r){let i,o=[];for(;null!==(i=e.exec(r));)o.push({data:i[0],index:i.index,mode:t,length:i[0].length});return o}function p(e){let t,r,o=u(a.NUMERIC,i.NUMERIC,e),n=u(a.ALPHANUMERIC,i.ALPHANUMERIC,e);return c.isKanjiModeEnabled()?(t=u(a.BYTE,i.BYTE,e),r=u(a.KANJI,i.KANJI,e)):(t=u(a.BYTE_KANJI,i.BYTE,e),r=[]),o.concat(n,t,r).sort(function(e,t){return e.index-t.index}).map(function(e){return{data:e.data,mode:e.mode,length:e.length}})}function g(e,t){switch(t){case i.NUMERIC:return o.getBitsLength(e);case i.ALPHANUMERIC:return n.getBitsLength(e);case i.KANJI:return s.getBitsLength(e);case i.BYTE:return l.getBitsLength(e)}}function f(e,t){let r,a=i.getBestModeForData(e);if((r=i.from(t,a))!==i.BYTE&&r.bit<a.bit)throw Error('"'+e+'" cannot be encoded with mode '+i.toString(r)+".\n Suggested mode is: "+i.toString(a));switch(r===i.KANJI&&!c.isKanjiModeEnabled()&&(r=i.BYTE),r){case i.NUMERIC:return new o(e);case i.ALPHANUMERIC:return new n(e);case i.KANJI:return new s(e);case i.BYTE:return new l(e)}}r.fromArray=function(e){return e.reduce(function(e,t){return"string"==typeof t?e.push(f(t,null)):t.data&&e.push(f(t.data,t.mode)),e},[])},r.fromString=function(e,t){let o=function(e,t){let r={},o={start:{}},n=["start"];for(let l=0;l<e.length;l++){let s=e[l],a=[];for(let e=0;e<s.length;e++){let c=s[e],h=""+l+e;a.push(h),r[h]={node:c,lastCount:0},o[h]={};for(let e=0;e<n.length;e++){let l=n[e];r[l]&&r[l].node.mode===c.mode?(o[l][h]=g(r[l].lastCount+c.length,c.mode)-g(r[l].lastCount,c.mode),r[l].lastCount+=c.length):(r[l]&&(r[l].lastCount=c.length),o[l][h]=g(c.length,c.mode)+4+i.getCharCountIndicator(c.mode,t))}}n=a}for(let e=0;e<n.length;e++)o[n[e]].end=0;return{map:o,table:r}}(function(e){let t=[];for(let r=0;r<e.length;r++){let o=e[r];switch(o.mode){case i.NUMERIC:t.push([o,{data:o.data,mode:i.ALPHANUMERIC,length:o.length},{data:o.data,mode:i.BYTE,length:o.length}]);break;case i.ALPHANUMERIC:t.push([o,{data:o.data,mode:i.BYTE,length:o.length}]);break;case i.KANJI:t.push([o,{data:o.data,mode:i.BYTE,length:d(o.data)}]);break;case i.BYTE:t.push([{data:o.data,mode:i.BYTE,length:d(o.data)}])}}return t}(p(e,c.isKanjiModeEnabled())),t),n=h.find_path(o.map,"start","end"),l=[];for(let e=1;e<n.length-1;e++)l.push(o.table[n[e]].node);return r.fromArray(l.reduce(function(e,t){let r=e.length-1>=0?e[e.length-1]:null;return r&&r.mode===t.mode?e[e.length-1].data+=t.data:e.push(t),e},[]))},r.rawSplit=function(e){return r.fromArray(p(e,c.isKanjiModeEnabled()))}},30671,(e,t,r)=>{let i=e.r(87201),o=e.r(73133),n=e.r(73666),l=e.r(11421),s=e.r(20637),a=e.r(14002),c=e.r(37692),h=e.r(48125),d=e.r(62458),u=e.r(93547),p=e.r(57655),g=e.r(50882),f=e.r(97930);function m(e,t,r){let i,o,n=e.size,l=p.getEncodedBits(t,r);for(i=0;i<15;i++)o=(l>>i&1)==1,i<6?e.set(i,8,o,!0):i<8?e.set(i+1,8,o,!0):e.set(n-15+i,8,o,!0),i<8?e.set(8,n-i-1,o,!0):i<9?e.set(8,15-i-1+1,o,!0):e.set(8,15-i-1,o,!0);e.set(n-8,8,1,!0)}r.create=function(e,t){let r,p;if(void 0===e||""===e)throw Error("No input text");let w=o.M;return void 0!==t&&(w=o.from(t.errorCorrectionLevel,o.M),r=u.from(t.version),p=c.from(t.maskPattern),t.toSJISFunc&&i.setToSJISFunction(t.toSJISFunc)),function(e,t,r,o){let p;if(Array.isArray(e))p=f.fromArray(e);else if("string"==typeof e){let i=t;if(!i){let t=f.rawSplit(e);i=u.getBestVersionForData(t,r)}p=f.fromString(e,i||40)}else throw Error("Invalid data");let w=u.getBestVersionForData(p,r);if(!w)throw Error("The amount of data is too big to be stored in a QR Code");if(t){if(t<w)throw Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+w+".\n")}else t=w;let y=function(e,t,r){let o=new n;r.forEach(function(t){o.put(t.mode.bit,4),o.put(t.getLength(),g.getCharCountIndicator(t.mode,e)),t.write(o)});let l=(i.getSymbolTotalCodewords(e)-h.getTotalCodewordsCount(e,t))*8;for(o.getLengthInBits()+4<=l&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(0);let s=(l-o.getLengthInBits())/8;for(let e=0;e<s;e++)o.put(e%2?17:236,8);return function(e,t,r){let o,n,l=i.getSymbolTotalCodewords(t),s=l-h.getTotalCodewordsCount(t,r),a=h.getBlocksCount(t,r),c=l%a,u=a-c,p=Math.floor(l/a),g=Math.floor(s/a),f=g+1,m=p-g,w=new d(m),y=0,b=Array(a),v=Array(a),C=0,x=new Uint8Array(e.buffer);for(let e=0;e<a;e++){let t=e<u?g:f;b[e]=x.slice(y,y+t),v[e]=w.encode(b[e]),y+=t,C=Math.max(C,t)}let $=new Uint8Array(l),E=0;for(o=0;o<C;o++)for(n=0;n<a;n++)o<b[n].length&&($[E++]=b[n][o]);for(o=0;o<m;o++)for(n=0;n<a;n++)$[E++]=v[n][o];return $}(o,e,t)}(t,r,p),b=new l(i.getSymbolSize(t));!function(e,t){let r=e.size,i=a.getPositions(t);for(let t=0;t<i.length;t++){let o=i[t][0],n=i[t][1];for(let t=-1;t<=7;t++)if(!(o+t<=-1)&&!(r<=o+t))for(let i=-1;i<=7;i++)n+i<=-1||r<=n+i||(t>=0&&t<=6&&(0===i||6===i)||i>=0&&i<=6&&(0===t||6===t)||t>=2&&t<=4&&i>=2&&i<=4?e.set(o+t,n+i,!0,!0):e.set(o+t,n+i,!1,!0))}}(b,t);let v=b.size;for(let e=8;e<v-8;e++){let t=e%2==0;b.set(e,6,t,!0),b.set(6,e,t,!0)}return!function(e,t){let r=s.getPositions(t);for(let t=0;t<r.length;t++){let i=r[t][0],o=r[t][1];for(let t=-2;t<=2;t++)for(let r=-2;r<=2;r++)-2===t||2===t||-2===r||2===r||0===t&&0===r?e.set(i+t,o+r,!0,!0):e.set(i+t,o+r,!1,!0)}}(b,t),m(b,r,0),t>=7&&function(e,t){let r,i,o,n=e.size,l=u.getEncodedBits(t);for(let t=0;t<18;t++)r=Math.floor(t/3),i=t%3+n-8-3,o=(l>>t&1)==1,e.set(r,i,o,!0),e.set(i,r,o,!0)}(b,t),!function(e,t){let r=e.size,i=-1,o=r-1,n=7,l=0;for(let s=r-1;s>0;s-=2)for(6===s&&s--;;){for(let r=0;r<2;r++)if(!e.isReserved(o,s-r)){let i=!1;l<t.length&&(i=(t[l]>>>n&1)==1),e.set(o,s-r,i),-1==--n&&(l++,n=7)}if((o+=i)<0||r<=o){o-=i,i=-i;break}}}(b,y),isNaN(o)&&(o=c.getBestMask(b,m.bind(null,b,r))),c.applyMask(o,b),m(b,r,o),{modules:b,version:t,errorCorrectionLevel:r,maskPattern:o,segments:p}}(e,r,w,p)}},25950,(e,t,r)=>{function i(e){if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Color should be defined as hex string");let t=e.slice().replace("#","").split("");if(t.length<3||5===t.length||t.length>8)throw Error("Invalid hex color: "+e);(3===t.length||4===t.length)&&(t=Array.prototype.concat.apply([],t.map(function(e){return[e,e]}))),6===t.length&&t.push("F","F");let r=parseInt(t.join(""),16);return{r:r>>24&255,g:r>>16&255,b:r>>8&255,a:255&r,hex:"#"+t.slice(0,6).join("")}}r.getOptions=function(e){e||(e={}),e.color||(e.color={});let t=void 0===e.margin||null===e.margin||e.margin<0?4:e.margin,r=e.width&&e.width>=21?e.width:void 0,o=e.scale||4;return{width:r,scale:r?4:o,margin:t,color:{dark:i(e.color.dark||"#000000ff"),light:i(e.color.light||"#ffffffff")},type:e.type,rendererOpts:e.rendererOpts||{}}},r.getScale=function(e,t){return t.width&&t.width>=e+2*t.margin?t.width/(e+2*t.margin):t.scale},r.getImageWidth=function(e,t){let i=r.getScale(e,t);return Math.floor((e+2*t.margin)*i)},r.qrToImageData=function(e,t,i){let o=t.modules.size,n=t.modules.data,l=r.getScale(o,i),s=Math.floor((o+2*i.margin)*l),a=i.margin*l,c=[i.color.light,i.color.dark];for(let t=0;t<s;t++)for(let r=0;r<s;r++){let h=(t*s+r)*4,d=i.color.light;t>=a&&r>=a&&t<s-a&&r<s-a&&(d=c[+!!n[Math.floor((t-a)/l)*o+Math.floor((r-a)/l)]]),e[h++]=d.r,e[h++]=d.g,e[h++]=d.b,e[h]=d.a}}},63037,(e,t,r)=>{let i=e.r(25950);r.render=function(e,t,r){var o;let n=r,l=t;void 0!==n||t&&t.getContext||(n=t,t=void 0),t||(l=function(){try{return document.createElement("canvas")}catch(e){throw Error("You need to specify a canvas element")}}()),n=i.getOptions(n);let s=i.getImageWidth(e.modules.size,n),a=l.getContext("2d"),c=a.createImageData(s,s);return i.qrToImageData(c.data,e,n),o=l,a.clearRect(0,0,o.width,o.height),o.style||(o.style={}),o.height=s,o.width=s,o.style.height=s+"px",o.style.width=s+"px",a.putImageData(c,0,0),l},r.renderToDataURL=function(e,t,i){let o=i;void 0!==o||t&&t.getContext||(o=t,t=void 0),o||(o={});let n=r.render(e,t,o),l=o.type||"image/png",s=o.rendererOpts||{};return n.toDataURL(l,s.quality)}},10891,(e,t,r)=>{let i=e.r(25950);function o(e,t){let r=e.a/255,i=t+'="'+e.hex+'"';return r<1?i+" "+t+'-opacity="'+r.toFixed(2).slice(1)+'"':i}function n(e,t,r){let i=e+t;return void 0!==r&&(i+=" "+r),i}r.render=function(e,t,r){let l=i.getOptions(t),s=e.modules.size,a=e.modules.data,c=s+2*l.margin,h=l.color.light.a?"<path "+o(l.color.light,"fill")+' d="M0 0h'+c+"v"+c+'H0z"/>':"",d="<path "+o(l.color.dark,"stroke")+' d="'+function(e,t,r){let i="",o=0,l=!1,s=0;for(let a=0;a<e.length;a++){let c=Math.floor(a%t),h=Math.floor(a/t);c||l||(l=!0),e[a]?(s++,a>0&&c>0&&e[a-1]||(i+=l?n("M",c+r,.5+h+r):n("m",o,0),o=0,l=!1),c+1<t&&e[a+1]||(i+=n("h",s),s=0)):o++}return i}(a,s,l.margin)+'"/>',u='<svg xmlns="http://www.w3.org/2000/svg" '+(l.width?'width="'+l.width+'" height="'+l.width+'" ':"")+('viewBox="0 0 '+c+" ")+c+'" shape-rendering="crispEdges">'+h+d+"</svg>\n";return"function"==typeof r&&r(null,u),u}},73134,(e,t,r)=>{let i=e.r(38750),o=e.r(30671),n=e.r(63037),l=e.r(10891);function s(e,t,r,n,l){let s=[].slice.call(arguments,1),a=s.length,c="function"==typeof s[a-1];if(!c&&!i())throw Error("Callback required as last argument");if(c){if(a<2)throw Error("Too few arguments provided");2===a?(l=r,r=t,t=n=void 0):3===a&&(t.getContext&&void 0===l?(l=n,n=void 0):(l=n,n=r,r=t,t=void 0))}else{if(a<1)throw Error("Too few arguments provided");return 1===a?(r=t,t=n=void 0):2!==a||t.getContext||(n=r,r=t,t=void 0),new Promise(function(i,l){try{let l=o.create(r,n);i(e(l,t,n))}catch(e){l(e)}})}try{let i=o.create(r,n);l(null,e(i,t,n))}catch(e){l(e)}}r.create=o.create,r.toCanvas=s.bind(null,n.render),r.toDataURL=s.bind(null,n.renderToDataURL),r.toString=s.bind(null,function(e,t,r){return l.render(e,r)})}]);