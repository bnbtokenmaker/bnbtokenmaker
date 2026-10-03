(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,71502,e=>{"use strict";e.i(12207);var t=e.i(8285),r=e.i(54479);e.i(74576);var i=e.i(20119),o=e.i(56350);e.i(34051);var a=e.i(29389),n=e.i(86259),s=e.i(60398),l=e.i(49454),c=e.i(3468),u=e.i(71080),d=e.i(21728),p=e.i(18454);let h={isUnsupportedChainView:()=>"UnsupportedChain"===d.RouterController.state.view||"SwitchNetwork"===d.RouterController.state.view&&d.RouterController.state.history.includes("UnsupportedChain"),async safeClose(){this.isUnsupportedChainView()||await p.SIWXUtil.isSIWXCloseDisabled()?c.ModalController.shake():(("DataCapture"===d.RouterController.state.view||"DataCaptureOtpConfirm"===d.RouterController.state.view)&&u.ConnectionController.disconnect(),c.ModalController.close())}};var m=e.i(82283),w=e.i(11424),g=e.i(65801),y=e.i(42710),f=e.i(75457),b=e.i(1564),v=e.i(79484),x=e.i(18887),k=e.i(64126),C=e.i(60334),S=e.i(27302),T=e.i(64717);let A={getGasPriceInEther:(e,t)=>Number(t*e)/1e18,getGasPriceInUSD(e,t,r){let i=A.getGasPriceInEther(t,r);return f.NumberUtil.bigNumber(e).times(i).toNumber()},getPriceImpact({sourceTokenAmount:e,sourceTokenPriceInUSD:t,toTokenPriceInUSD:r,toTokenAmount:i}){let o=f.NumberUtil.bigNumber(e).times(t),a=f.NumberUtil.bigNumber(i).times(r);return o.minus(a).div(o).times(100).toNumber()},getMaxSlippage(e,t){let r=f.NumberUtil.bigNumber(e).div(100);return f.NumberUtil.multiply(t,r).toNumber()},getProviderFee:(e,t=.0085)=>f.NumberUtil.bigNumber(e).times(t).toString(),isInsufficientNetworkTokenForGas:(e,t)=>!!f.NumberUtil.bigNumber(e).eq(0)||f.NumberUtil.bigNumber(f.NumberUtil.bigNumber(t||"0")).gt(e),isInsufficientSourceTokenForSwap(e,t,r){let i=r?.find(e=>e.address===t)?.quantity?.numeric;return f.NumberUtil.bigNumber(i||"0").lt(e)}};var P=e.i(92279),$=e.i(51887),E=e.i(24742),I=e.i(53157);let N={initializing:!1,initialized:!1,loadingPrices:!1,loadingQuote:!1,loadingApprovalTransaction:!1,loadingBuildTransaction:!1,loadingTransaction:!1,switchingTokens:!1,fetchError:!1,approvalTransaction:void 0,swapTransaction:void 0,transactionError:void 0,sourceToken:void 0,sourceTokenAmount:"",sourceTokenPriceInUSD:0,toToken:void 0,toTokenAmount:"",toTokenPriceInUSD:0,networkPrice:"0",networkBalanceInUSD:"0",networkTokenSymbol:"",inputError:void 0,slippage:C.ConstantsUtil.CONVERT_SLIPPAGE_TOLERANCE,tokens:void 0,popularTokens:void 0,suggestedTokens:void 0,foundTokens:void 0,myTokensWithBalance:void 0,tokensPriceMap:{},gasFee:"0",gasPriceInUSD:0,priceImpact:void 0,maxSlippage:void 0,providerFee:void 0},R=(0,g.proxy)({...N}),U={state:R,subscribe:e=>(0,g.subscribe)(R,()=>e(R)),subscribeKey:(e,t)=>(0,y.subscribeKey)(R,e,t),getParams(){let e=s.ChainController.state.activeChain,t=s.ChainController.getAccountData(e)?.caipAddress??s.ChainController.state.activeCaipAddress,r=S.CoreHelperUtil.getPlainAddress(t),i=(0,k.getActiveNetworkTokenAddress)(),o=l.ConnectorController.getConnectorId(s.ChainController.state.activeChain);if(!r)throw Error("No address found to swap the tokens from.");let a=!R.toToken?.address||!R.toToken?.decimals,n=!R.sourceToken?.address||!R.sourceToken?.decimals||!f.NumberUtil.bigNumber(R.sourceTokenAmount).gt(0),c=!R.sourceTokenAmount;return{networkAddress:i,fromAddress:r,fromCaipAddress:t,sourceTokenAddress:R.sourceToken?.address,toTokenAddress:R.toToken?.address,toTokenAmount:R.toTokenAmount,toTokenDecimals:R.toToken?.decimals,sourceTokenAmount:R.sourceTokenAmount,sourceTokenDecimals:R.sourceToken?.decimals,invalidToToken:a,invalidSourceToken:n,invalidSourceTokenAmount:c,availableToSwap:t&&!a&&!n&&!c,isAuthConnector:o===b.ConstantsUtil.CONNECTOR_ID.AUTH}},async setSourceToken(e){if(!e){R.sourceToken=e,R.sourceTokenAmount="",R.sourceTokenPriceInUSD=0;return}R.sourceToken=e,await O.setTokenPrice(e.address,"sourceToken")},setSourceTokenAmount(e){R.sourceTokenAmount=e},async setToToken(e){if(!e){R.toToken=e,R.toTokenAmount="",R.toTokenPriceInUSD=0;return}R.toToken=e,await O.setTokenPrice(e.address,"toToken")},setToTokenAmount(e){R.toTokenAmount=e?f.NumberUtil.toFixed(e,6):""},async setTokenPrice(e,t){let r=R.tokensPriceMap[e]||0;r||(R.loadingPrices=!0,r=await O.getAddressPrice(e)),"sourceToken"===t?R.sourceTokenPriceInUSD=r:"toToken"===t&&(R.toTokenPriceInUSD=r),R.loadingPrices&&(R.loadingPrices=!1),O.getParams().availableToSwap&&!R.switchingTokens&&O.swapTokens()},async switchTokens(){if(!R.initializing&&R.initialized&&!R.switchingTokens){R.switchingTokens=!0;try{let e=R.toToken?{...R.toToken}:void 0,t=R.sourceToken?{...R.sourceToken}:void 0,r=e&&""===R.toTokenAmount?"1":R.toTokenAmount;O.setSourceTokenAmount(r),O.setToTokenAmount(""),await O.setSourceToken(e),await O.setToToken(t),R.switchingTokens=!1,O.swapTokens()}catch(e){throw R.switchingTokens=!1,e}}},resetState(){R.myTokensWithBalance=N.myTokensWithBalance,R.tokensPriceMap=N.tokensPriceMap,R.initialized=N.initialized,R.initializing=N.initializing,R.switchingTokens=N.switchingTokens,R.sourceToken=N.sourceToken,R.sourceTokenAmount=N.sourceTokenAmount,R.sourceTokenPriceInUSD=N.sourceTokenPriceInUSD,R.toToken=N.toToken,R.toTokenAmount=N.toTokenAmount,R.toTokenPriceInUSD=N.toTokenPriceInUSD,R.networkPrice=N.networkPrice,R.networkTokenSymbol=N.networkTokenSymbol,R.networkBalanceInUSD=N.networkBalanceInUSD,R.inputError=N.inputError},resetValues(){let{networkAddress:e}=O.getParams(),t=R.tokens?.find(t=>t.address===e);O.setSourceToken(t),O.setToToken(void 0)},getApprovalLoadingState:()=>R.loadingApprovalTransaction,clearError(){R.transactionError=void 0},async initializeState(){if(!R.initializing){if(R.initializing=!0,!R.initialized)try{await O.fetchTokens(),R.initialized=!0}catch(e){R.initialized=!1,w.SnackController.showError("Failed to initialize swap"),d.RouterController.goBack()}R.initializing=!1}},async fetchTokens(){let{networkAddress:e}=O.getParams();await O.getNetworkTokenPrice(),await O.getMyTokensWithBalance();let t=R.myTokensWithBalance?.find(t=>t.address===e);t&&(R.networkTokenSymbol=t.symbol,O.setSourceToken(t),O.setSourceTokenAmount("0"))},async getTokenList(){let e=s.ChainController.state.activeCaipNetwork?.caipNetworkId;if(R.caipNetworkId!==e||!R.tokens)try{R.tokensLoading=!0;let t=await T.SwapApiUtil.getTokenList(e);R.tokens=t,R.caipNetworkId=e,R.popularTokens=t.sort((e,t)=>e.symbol<t.symbol?-1:+(e.symbol>t.symbol));let r=(e&&C.ConstantsUtil.SUGGESTED_TOKENS_BY_CHAIN?.[e]||[]).map(e=>t.find(t=>t.symbol===e)).filter(e=>!!e),i=(C.ConstantsUtil.SWAP_SUGGESTED_TOKENS||[]).map(e=>t.find(t=>t.symbol===e)).filter(e=>!!e).filter(e=>!r.some(t=>t.address===e.address));R.suggestedTokens=[...r,...i]}catch(e){R.tokens=[],R.popularTokens=[],R.suggestedTokens=[]}finally{R.tokensLoading=!1}},async getAddressPrice(e){let t=R.tokensPriceMap[e];if(t)return t;let r=await E.BlockchainApiController.fetchTokenPrice({addresses:[e]}),i=r?.fungibles||[],o=[...R.tokens||[],...R.myTokensWithBalance||[]],a=o?.find(t=>t.address===e)?.symbol,n=parseFloat((i.find(e=>e.symbol.toLowerCase()===a?.toLowerCase())?.price||0).toString());return R.tokensPriceMap[e]=n,n},async getNetworkTokenPrice(){let{networkAddress:e}=O.getParams(),t=await E.BlockchainApiController.fetchTokenPrice({addresses:[e]}).catch(()=>(w.SnackController.showError("Failed to fetch network token price"),{fungibles:[]})),r=t.fungibles?.[0],i=r?.price.toString()||"0";R.tokensPriceMap[e]=parseFloat(i),R.networkTokenSymbol=r?.symbol||"",R.networkPrice=i},async getMyTokensWithBalance(e){let t=await x.BalanceUtil.getMyTokensWithBalance({forceUpdate:e,caipNetwork:s.ChainController.state.activeCaipNetwork,address:s.ChainController.getAccountData()?.address}),r=T.SwapApiUtil.mapBalancesToSwapTokens(t);r&&(await O.getInitialGasPrice(),O.setBalances(r))},setBalances(e){let{networkAddress:t}=O.getParams(),r=s.ChainController.state.activeCaipNetwork;if(!r)return;let i=e.find(e=>e.address===t);e.forEach(e=>{R.tokensPriceMap[e.address]=e.price||0}),R.myTokensWithBalance=e.filter(e=>e.address.startsWith(r.caipNetworkId)),R.networkBalanceInUSD=i?f.NumberUtil.multiply(i.quantity.numeric,i.price).toString():"0"},async getInitialGasPrice(){let e=await T.SwapApiUtil.fetchGasPrice();if(!e)return{gasPrice:null,gasPriceInUSD:null};switch(s.ChainController.state?.activeCaipNetwork?.chainNamespace){case b.ConstantsUtil.CHAIN.SOLANA:return R.gasFee=e.standard??"0",R.gasPriceInUSD=f.NumberUtil.multiply(e.standard,R.networkPrice).div(1e9).toNumber(),{gasPrice:BigInt(R.gasFee),gasPriceInUSD:Number(R.gasPriceInUSD)};case b.ConstantsUtil.CHAIN.EVM:default:let t=e.standard??"0",r=BigInt(t),i=BigInt(15e4),o=A.getGasPriceInUSD(R.networkPrice,i,r);return R.gasFee=t,R.gasPriceInUSD=o,{gasPrice:r,gasPriceInUSD:o}}},async swapTokens(){let e=s.ChainController.getAccountData()?.address,t=R.sourceToken,r=R.toToken,i=f.NumberUtil.bigNumber(R.sourceTokenAmount).gt(0);if(i||O.setToTokenAmount(""),!r||!t||R.loadingPrices||!i||!e)return;R.loadingQuote=!0;let o=f.NumberUtil.bigNumber(R.sourceTokenAmount).times(10**t.decimals).round(0).toFixed(0);try{let i=await E.BlockchainApiController.fetchSwapQuote({userAddress:e,from:t.address,to:r.address,gasPrice:R.gasFee,amount:o.toString()});R.loadingQuote=!1;let a=i?.quotes?.[0]?.toAmount;if(!a)return void $.AlertController.open({displayMessage:"Incorrect amount",debugMessage:"Please enter a valid amount"},"error");let n=f.NumberUtil.bigNumber(a).div(10**r.decimals).toString();O.setToTokenAmount(n),O.hasInsufficientToken(R.sourceTokenAmount,t.address)?R.inputError="Insufficient balance":(R.inputError=void 0,O.setTransactionDetails())}catch(t){let e=await T.SwapApiUtil.handleSwapError(t);R.loadingQuote=!1,R.inputError=e||"Insufficient balance"}},async getTransaction(){let{fromCaipAddress:e,availableToSwap:t}=O.getParams(),r=R.sourceToken,i=R.toToken;if(e&&t&&r&&i&&!R.loadingQuote)try{let t;return R.loadingBuildTransaction=!0,t=await T.SwapApiUtil.fetchSwapAllowance({userAddress:e,tokenAddress:r.address,sourceTokenAmount:R.sourceTokenAmount,sourceTokenDecimals:r.decimals})?await O.createSwapTransaction():await O.createAllowanceTransaction(),R.loadingBuildTransaction=!1,R.fetchError=!1,t}catch(e){d.RouterController.goBack(),w.SnackController.showError("Failed to check allowance"),R.loadingBuildTransaction=!1,R.approvalTransaction=void 0,R.swapTransaction=void 0,R.fetchError=!0;return}},async createAllowanceTransaction(){let{fromCaipAddress:e,sourceTokenAddress:t,toTokenAddress:r}=O.getParams();if(e&&r){if(!t)throw Error("createAllowanceTransaction - No source token address found.");try{let i=await E.BlockchainApiController.generateApproveCalldata({from:t,to:r,userAddress:e}),o=S.CoreHelperUtil.getPlainAddress(i.tx.from);if(!o)throw Error("SwapController:createAllowanceTransaction - address is required");let a={data:i.tx.data,to:o,gasPrice:BigInt(i.tx.eip155.gasPrice),value:BigInt(i.tx.value),toAmount:R.toTokenAmount};return R.swapTransaction=void 0,R.approvalTransaction={data:a.data,to:a.to,gasPrice:a.gasPrice,value:a.value,toAmount:a.toAmount},{data:a.data,to:a.to,gasPrice:a.gasPrice,value:a.value,toAmount:a.toAmount}}catch(e){d.RouterController.goBack(),w.SnackController.showError("Failed to create approval transaction"),R.approvalTransaction=void 0,R.swapTransaction=void 0,R.fetchError=!0;return}}},async createSwapTransaction(){let{networkAddress:e,fromCaipAddress:t,sourceTokenAmount:r}=O.getParams(),i=R.sourceToken,o=R.toToken;if(!t||!r||!i||!o)return;let a=u.ConnectionController.parseUnits(r,i.decimals)?.toString();try{let r=await E.BlockchainApiController.generateSwapCalldata({userAddress:t,from:i.address,to:o.address,amount:a,disableEstimate:!0}),n=i.address===e,s=BigInt(r.tx.eip155.gas),l=BigInt(r.tx.eip155.gasPrice),c=S.CoreHelperUtil.getPlainAddress(r.tx.to);if(!c)throw Error("SwapController:createSwapTransaction - address is required");let u={data:r.tx.data,to:c,gas:s,gasPrice:l,value:n?BigInt(a??"0"):BigInt("0"),toAmount:R.toTokenAmount};return R.gasPriceInUSD=A.getGasPriceInUSD(R.networkPrice,s,l),R.approvalTransaction=void 0,R.swapTransaction=u,u}catch(e){d.RouterController.goBack(),w.SnackController.showError("Failed to create transaction"),R.approvalTransaction=void 0,R.swapTransaction=void 0,R.fetchError=!0;return}},onEmbeddedWalletApprovalSuccess(){w.SnackController.showLoading("Approve limit increase in your wallet"),d.RouterController.replace("SwapPreview")},async sendTransactionForApproval(e){let{fromAddress:t,isAuthConnector:r}=O.getParams();R.loadingApprovalTransaction=!0,r?d.RouterController.pushTransactionStack({onSuccess:O.onEmbeddedWalletApprovalSuccess}):w.SnackController.showLoading("Approve limit increase in your wallet");try{await u.ConnectionController.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:b.ConstantsUtil.CHAIN.EVM}),await O.swapTokens(),await O.getTransaction(),R.approvalTransaction=void 0,R.loadingApprovalTransaction=!1}catch(e){R.transactionError=e?.displayMessage,R.loadingApprovalTransaction=!1,w.SnackController.showError(e?.displayMessage||"Transaction error"),I.EventsController.sendEvent({type:"track",event:"SWAP_APPROVAL_ERROR",properties:{message:e?.displayMessage||e?.message||"Unknown",network:s.ChainController.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:O.state.sourceToken?.symbol||"",swapToToken:O.state.toToken?.symbol||"",swapFromAmount:O.state.sourceTokenAmount||"",swapToAmount:O.state.toTokenAmount||"",isSmartAccount:(0,k.getPreferredAccountType)(b.ConstantsUtil.CHAIN.EVM)===v.W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT}})}},async sendTransactionForSwap(e){if(!e)return;let{fromAddress:t,toTokenAmount:r,isAuthConnector:i}=O.getParams();R.loadingTransaction=!0;let o=`Swapping ${R.sourceToken?.symbol} to ${f.NumberUtil.formatNumberToLocalString(r,3)} ${R.toToken?.symbol}`,a=`Swapped ${R.sourceToken?.symbol} to ${f.NumberUtil.formatNumberToLocalString(r,3)} ${R.toToken?.symbol}`;i?d.RouterController.pushTransactionStack({onSuccess(){d.RouterController.replace("Account"),w.SnackController.showLoading(o),U.resetState()}}):w.SnackController.showLoading("Confirm transaction in your wallet");try{let r=[R.sourceToken?.address,R.toToken?.address].join(","),o=await u.ConnectionController.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:b.ConstantsUtil.CHAIN.EVM});return R.loadingTransaction=!1,w.SnackController.showSuccess(a),I.EventsController.sendEvent({type:"track",event:"SWAP_SUCCESS",properties:{network:s.ChainController.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:O.state.sourceToken?.symbol||"",swapToToken:O.state.toToken?.symbol||"",swapFromAmount:O.state.sourceTokenAmount||"",swapToAmount:O.state.toTokenAmount||"",isSmartAccount:(0,k.getPreferredAccountType)(b.ConstantsUtil.CHAIN.EVM)===v.W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT}}),U.resetState(),i||d.RouterController.replace("Account"),U.getMyTokensWithBalance(r),o}catch(e){R.transactionError=e?.displayMessage,R.loadingTransaction=!1,w.SnackController.showError(e?.displayMessage||"Transaction error"),I.EventsController.sendEvent({type:"track",event:"SWAP_ERROR",properties:{message:e?.displayMessage||e?.message||"Unknown",network:s.ChainController.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:O.state.sourceToken?.symbol||"",swapToToken:O.state.toToken?.symbol||"",swapFromAmount:O.state.sourceTokenAmount||"",swapToAmount:O.state.toTokenAmount||"",isSmartAccount:(0,k.getPreferredAccountType)(b.ConstantsUtil.CHAIN.EVM)===v.W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT}});return}},hasInsufficientToken:(e,t)=>A.isInsufficientSourceTokenForSwap(e,t,R.myTokensWithBalance),setTransactionDetails(){let{toTokenAddress:e,toTokenDecimals:t}=O.getParams();e&&t&&(R.gasPriceInUSD=A.getGasPriceInUSD(R.networkPrice,BigInt(R.gasFee),BigInt(15e4)),R.priceImpact=A.getPriceImpact({sourceTokenAmount:R.sourceTokenAmount,sourceTokenPriceInUSD:R.sourceTokenPriceInUSD,toTokenPriceInUSD:R.toTokenPriceInUSD,toTokenAmount:R.toTokenAmount}),R.maxSlippage=A.getMaxSlippage(R.slippage,R.toTokenAmount),R.providerFee=A.getProviderFee(R.sourceTokenAmount))}},O=(0,P.withErrorBoundary)(U);var D=e.i(39403);e.i(4041);var W=e.i(12699),z=e.i(45975),L=e.i(59088),B=e.i(62611),j=t;let F=B.css`
  :host {
    display: block;
    border-radius: clamp(0px, ${({borderRadius:e})=>e["8"]}, 44px);
    box-shadow: 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    overflow: hidden;
  }
`,q=class extends j.LitElement{render(){return r.html`<slot></slot>`}};q.styles=[L.resetStyles,F],q=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n}([(0,z.customElement)("wui-card")],q),e.i(62238);var _=t,M=t;e.i(52634),e.i(39009),e.i(73944);let H=B.css`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[6]};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  :host > wui-flex[data-type='info'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};

      wui-icon {
        color: ${({tokens:e})=>e.theme.iconDefault};
      }
    }
  }
  :host > wui-flex[data-type='success'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderSuccess};
      }
    }
  }
  :host > wui-flex[data-type='warning'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundWarning};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderWarning};
      }
    }
  }
  :host > wui-flex[data-type='error'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundError};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderError};
      }
    }
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:e})=>e["2"]};
    background-color: var(--local-icon-bg-value);
  }
`;var V=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let K={info:"info",success:"checkmark",warning:"warningCircle",error:"warning"},Q=class extends M.LitElement{constructor(){super(...arguments),this.message="",this.type="info"}render(){return r.html`
      <wui-flex
        data-type=${(0,a.ifDefined)(this.type)}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap="2"
      >
        <wui-flex columnGap="2" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color="inherit" size="md" name=${K[this.type]}></wui-icon>
          </wui-flex>
          <wui-text variant="md-medium" color="inherit" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="inherit"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `}onClose(){$.AlertController.close()}};Q.styles=[L.resetStyles,H],V([(0,i.property)()],Q.prototype,"message",void 0),V([(0,i.property)()],Q.prototype,"type",void 0),Q=V([(0,z.customElement)("wui-alertbar")],Q);let G=B.css`
  :host {
    display: block;
    position: absolute;
    top: ${({spacing:e})=>e["3"]};
    left: ${({spacing:e})=>e["4"]};
    right: ${({spacing:e})=>e["4"]};
    opacity: 0;
    pointer-events: none;
  }
`;var Y=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let X={info:{backgroundColor:"fg-350",iconColor:"fg-325",icon:"info"},success:{backgroundColor:"success-glass-reown-020",iconColor:"success-125",icon:"checkmark"},warning:{backgroundColor:"warning-glass-reown-020",iconColor:"warning-100",icon:"warningCircle"},error:{backgroundColor:"error-glass-reown-020",iconColor:"error-125",icon:"warning"}},Z=class extends _.LitElement{constructor(){super(),this.unsubscribe=[],this.open=$.AlertController.state.open,this.onOpen(!0),this.unsubscribe.push($.AlertController.subscribeKey("open",e=>{this.open=e,this.onOpen(!1)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=$.AlertController.state,i=X[t];return r.html`
      <wui-alertbar
        message=${e}
        backgroundColor=${i?.backgroundColor}
        iconColor=${i?.iconColor}
        icon=${i?.icon}
        type=${t}
      ></wui-alertbar>
    `}onOpen(e){this.open?(this.animate([{opacity:0,transform:"scale(0.85)"},{opacity:1,transform:"scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: auto"):e||(this.animate([{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: none")}};Z.styles=G,Y([(0,o.state)()],Z.prototype,"open",void 0),Z=Y([(0,z.customElement)("w3m-alertbar")],Z);var J=t,ee=e.i(41845),et=e.i(36220),er=t;let ei=B.css`
  :host {
    position: relative;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  /* -- Colors --------------------------------------------------- */
  button[data-type='accent'] wui-icon {
    color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  button[data-type='neutral'][data-variant='primary'] wui-icon {
    color: ${({tokens:e})=>e.theme.iconInverse};
  }

  button[data-type='neutral'][data-variant='secondary'] wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button[data-type='success'] wui-icon {
    color: ${({tokens:e})=>e.core.iconSuccess};
  }

  button[data-type='error'] wui-icon {
    color: ${({tokens:e})=>e.core.iconError};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='xs'] {
    width: 16px;
    height: 16px;

    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='sm'] {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'] {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='lg'] {
    width: 28px;
    height: 28px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='xs'] wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] wui-icon {
    width: 20px;
    height: 20px;
  }

  /* -- Hover --------------------------------------------------- */
  @media (hover: hover) {
    button[data-type='accent']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    }

    button[data-variant='primary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }

    button[data-variant='secondary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }

    button[data-type='success']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};
    }

    button[data-type='error']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.backgroundError};
    }
  }

  /* -- Focus --------------------------------------------------- */
  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  /* -- Properties --------------------------------------------------- */
  button[data-full-width='true'] {
    width: 100%;
  }

  :host([fullWidth]) {
    width: 100%;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var eo=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let ea=class extends er.LitElement{constructor(){super(...arguments),this.icon="card",this.variant="primary",this.type="accent",this.size="md",this.iconSize=void 0,this.fullWidth=!1,this.disabled=!1}render(){return r.html`<button
      data-variant=${this.variant}
      data-type=${this.type}
      data-size=${this.size}
      data-full-width=${this.fullWidth}
      ?disabled=${this.disabled}
    >
      <wui-icon color="inherit" name=${this.icon} size=${(0,a.ifDefined)(this.iconSize)}></wui-icon>
    </button>`}};ea.styles=[L.resetStyles,L.elementStyles,ei],eo([(0,i.property)()],ea.prototype,"icon",void 0),eo([(0,i.property)()],ea.prototype,"variant",void 0),eo([(0,i.property)()],ea.prototype,"type",void 0),eo([(0,i.property)()],ea.prototype,"size",void 0),eo([(0,i.property)()],ea.prototype,"iconSize",void 0),eo([(0,i.property)({type:Boolean})],ea.prototype,"fullWidth",void 0),eo([(0,i.property)({type:Boolean})],ea.prototype,"disabled",void 0),ea=eo([(0,z.customElement)("wui-icon-button")],ea);var en=t;e.i(64380);let es=B.css`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    border-radius: ${({borderRadius:e})=>e[32]};
  }

  wui-image {
    border-radius: 100%;
  }

  wui-text {
    padding-left: ${({spacing:e})=>e[1]};
  }

  .left-icon-container,
  .right-icon-container {
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='lg'] wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .left-icon-container {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .left-icon-container {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .left-icon-container {
    width: 16px;
    height: 16px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-type='filled-dropdown'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-type='text-dropdown'] {
    background-color: transparent;
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    opacity: 0.5;
  }
`;var el=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let ec={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},eu={lg:"lg",md:"md",sm:"sm"},ed=class extends en.LitElement{constructor(){super(...arguments),this.imageSrc="",this.text="",this.size="lg",this.type="text-dropdown",this.disabled=!1}render(){return r.html`<button ?disabled=${this.disabled} data-size=${this.size} data-type=${this.type}>
      ${this.imageTemplate()} ${this.textTemplate()}
      <wui-flex class="right-icon-container">
        <wui-icon name="chevronBottom"></wui-icon>
      </wui-flex>
    </button>`}textTemplate(){let e=ec[this.size];return this.text?r.html`<wui-text color="primary" variant=${e}>${this.text}</wui-text>`:null}imageTemplate(){if(this.imageSrc)return r.html`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`;let e=eu[this.size];return r.html` <wui-flex class="left-icon-container">
      <wui-icon size=${e} name="networkPlaceholder"></wui-icon>
    </wui-flex>`}};ed.styles=[L.resetStyles,L.elementStyles,es],el([(0,i.property)()],ed.prototype,"imageSrc",void 0),el([(0,i.property)()],ed.prototype,"text",void 0),el([(0,i.property)()],ed.prototype,"size",void 0),el([(0,i.property)()],ed.prototype,"type",void 0),el([(0,i.property)({type:Boolean})],ed.prototype,"disabled",void 0),ed=el([(0,z.customElement)("wui-select")],ed),e.i(30352),e.i(49536);var ep=e.i(47167);let eh={ACCOUNT_TABS:[{label:"Tokens"},{label:"Activity"}],SECURE_SITE_ORIGIN:(void 0!==ep.default&&void 0!==ep.default.env?ep.default.env.NEXT_PUBLIC_SECURE_SITE_ORIGIN:void 0)||"https://secure.walletconnect.org",VIEW_DIRECTION:{Next:"next",Prev:"prev"},ANIMATION_DURATIONS:{HeaderText:120,ModalHeight:150,ViewTransition:150},VIEWS_WITH_LEGAL_FOOTER:["Connect","ConnectWallets","OnRampTokenSelect","OnRampFiatSelect","OnRampProviders"],VIEWS_WITH_DEFAULT_FOOTER:["Networks"]};var em=t,ew=t;e.i(34420),e.i(43452);var eg=t;let ey=B.css`
  button {
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  button[data-variant='accent']:hover:enabled,
  button[data-variant='accent']:focus-visible {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='primary']:hover:enabled,
  button[data-variant='primary']:focus-visible,
  button[data-variant='secondary']:hover:enabled,
  button[data-variant='secondary']:focus-visible {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button[data-size='xs'] > wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='xs'],
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'],
  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='md'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  button:disabled {
    background-color: transparent;
    cursor: not-allowed;
    opacity: 0.5;
  }

  button:hover:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
  }

  button:focus-visible:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
`;var ef=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let eb=class extends eg.LitElement{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.icon="copy",this.iconColor="default",this.variant="accent"}render(){return r.html`
      <button data-variant=${this.variant} ?disabled=${this.disabled} data-size=${this.size}>
        <wui-icon
          color=${({accent:"accent-primary",primary:"inverse",secondary:"default"})[this.variant]||this.iconColor}
          size=${this.size}
          name=${this.icon}
        ></wui-icon>
      </button>
    `}};eb.styles=[L.resetStyles,L.elementStyles,ey],ef([(0,i.property)()],eb.prototype,"size",void 0),ef([(0,i.property)({type:Boolean})],eb.prototype,"disabled",void 0),ef([(0,i.property)()],eb.prototype,"icon",void 0),ef([(0,i.property)()],eb.prototype,"iconColor",void 0),ef([(0,i.property)()],eb.prototype,"variant",void 0),eb=ef([(0,z.customElement)("wui-icon-link")],eb),e.i(43053),e.i(21147);var ev=t;let ex=r.svg`<svg width="86" height="96" fill="none">
  <path
    d="M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z"
  />
</svg>`;var ek=e.i(52157);let eC=r.svg`
  <svg fill="none" viewBox="0 0 36 40">
    <path
      d="M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z"
    />
  </svg>
`,eS=B.css`
  :host {
    position: relative;
    border-radius: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--local-width);
    height: var(--local-height);
  }

  :host([data-round='true']) {
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: 100%;
    outline: 1px solid ${({tokens:e})=>e.core.glass010};
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  svg > path {
    stroke: var(--local-stroke);
  }

  wui-image {
    width: 100%;
    height: 100%;
    -webkit-clip-path: var(--local-path);
    clip-path: var(--local-path);
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon {
    transform: translateY(-5%);
    width: var(--local-icon-size);
    height: var(--local-icon-size);
  }
`;var eT=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let eA=class extends ev.LitElement{constructor(){super(...arguments),this.size="md",this.name="uknown",this.networkImagesBySize={sm:eC,md:ek.networkSvgMd,lg:ex},this.selected=!1,this.round=!1}render(){return this.round?(this.dataset.round="true",this.style.cssText=`
      --local-width: var(--apkt-spacing-10);
      --local-height: var(--apkt-spacing-10);
      --local-icon-size: var(--apkt-spacing-4);
    `):this.style.cssText=`

      --local-path: var(--apkt-path-network-${this.size});
      --local-width:  var(--apkt-width-network-${this.size});
      --local-height:  var(--apkt-height-network-${this.size});
      --local-icon-size:  var(--apkt-spacing-${({sm:"4",md:"6",lg:"10"})[this.size]});
    `,r.html`${this.templateVisual()} ${this.svgTemplate()} `}svgTemplate(){return this.round?null:this.networkImagesBySize[this.size]}templateVisual(){return this.imageSrc?r.html`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:r.html`<wui-icon size="inherit" color="default" name="networkPlaceholder"></wui-icon>`}};eA.styles=[L.resetStyles,eS],eT([(0,i.property)()],eA.prototype,"size",void 0),eT([(0,i.property)()],eA.prototype,"name",void 0),eT([(0,i.property)({type:Object})],eA.prototype,"networkImagesBySize",void 0),eT([(0,i.property)()],eA.prototype,"imageSrc",void 0),eT([(0,i.property)({type:Boolean})],eA.prototype,"selected",void 0),eT([(0,i.property)({type:Boolean})],eA.prototype,"round",void 0),eA=eT([(0,z.customElement)("wui-network-image")],eA);var eP=t;let e$=B.css`
  :host {
    position: relative;
    display: flex;
    width: 100%;
    height: 1px;
    background-color: ${({tokens:e})=>e.theme.borderPrimary};
    justify-content: center;
    align-items: center;
  }

  :host > wui-text {
    position: absolute;
    padding: 0px 8px;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  :host([data-bg-color='primary']) > wui-text {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  :host([data-bg-color='secondary']) > wui-text {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }
`;var eE=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let eI=class extends eP.LitElement{constructor(){super(...arguments),this.text="",this.bgColor="primary"}render(){return this.dataset.bgColor=this.bgColor,r.html`${this.template()}`}template(){return this.text?r.html`<wui-text variant="md-regular" color="secondary">${this.text}</wui-text>`:null}};eI.styles=[L.resetStyles,e$],eE([(0,i.property)()],eI.prototype,"text",void 0),eE([(0,i.property)()],eI.prototype,"bgColor",void 0),eI=eE([(0,z.customElement)("wui-separator")],eI),e.i(56303);var eN=e.i(50576),eR=e.i(69718);let eU="INVALID_PAYMENT_CONFIG",eO="INVALID_RECIPIENT",eD="INVALID_ASSET",eW="INVALID_AMOUNT",ez="UNABLE_TO_INITIATE_PAYMENT",eL="INVALID_CHAIN_NAMESPACE",eB="GENERIC_PAYMENT_ERROR",ej="UNABLE_TO_GET_EXCHANGES",eF="ASSET_NOT_SUPPORTED",eq="UNABLE_TO_GET_PAY_URL",e_="UNABLE_TO_GET_BUY_STATUS",eM="UNABLE_TO_GET_QUOTE",eH="UNABLE_TO_GET_QUOTE_STATUS",eV="INVALID_RECIPIENT_ADDRESS_FOR_ASSET",eK={[eU]:"Invalid payment configuration",[eO]:"Invalid recipient address",[eD]:"Invalid asset specified",[eW]:"Invalid payment amount",[eV]:"Invalid recipient address for the asset selected",UNKNOWN_ERROR:"Unknown payment error occurred",[ez]:"Unable to initiate payment",[eL]:"Invalid chain namespace",[eB]:"Unable to process payment",[ej]:"Unable to get exchanges",[eF]:"Asset not supported by the selected exchange",[eq]:"Unable to get payment URL",[e_]:"Unable to get buy status",UNABLE_TO_GET_TOKEN_BALANCES:"Unable to get token balances",[eM]:"Unable to get quote. Please choose a different token",[eH]:"Unable to get quote status"};class eQ extends Error{get message(){return eK[this.code]}constructor(e,t){super(eK[e]),this.name="AppKitPayError",this.code=e,this.details=t,Error.captureStackTrace&&Error.captureStackTrace(this,eQ)}}var eG=e.i(64258);let eY="reown_test";var eX=e.i(59204),eZ=e.i(62579);async function eJ(e,t,r){if(t!==b.ConstantsUtil.CHAIN.EVM)throw new eQ(eL);if(!r.fromAddress)throw new eQ(eU,"fromAddress is required for native EVM payments.");let i="string"==typeof r.amount?parseFloat(r.amount):r.amount;if(isNaN(i))throw new eQ(eU);let o=e.metadata?.decimals??18,a=u.ConnectionController.parseUnits(i.toString(),o);if("bigint"!=typeof a)throw new eQ(eB);return await u.ConnectionController.sendTransaction({chainNamespace:t,to:r.recipient,address:r.fromAddress,value:a,data:"0x"})??void 0}async function e0(e,t){if(!t.fromAddress)throw new eQ(eU,"fromAddress is required for ERC20 EVM payments.");let r=e.asset,i=t.recipient,o=Number(e.metadata.decimals),a=u.ConnectionController.parseUnits(t.amount.toString(),o);if(void 0===a)throw new eQ(eB);return await u.ConnectionController.writeContract({fromAddress:t.fromAddress,tokenAddress:r,args:[i,a],method:"transfer",abi:eX.ContractUtil.getERC20Abi(r),chainNamespace:b.ConstantsUtil.CHAIN.EVM})??void 0}async function e3(e,t){if(e!==b.ConstantsUtil.CHAIN.SOLANA)throw new eQ(eL);if(!t.fromAddress)throw new eQ(eU,"fromAddress is required for Solana payments.");let r="string"==typeof t.amount?parseFloat(t.amount):t.amount;if(isNaN(r)||r<=0)throw new eQ(eU,"Invalid payment amount.");try{if(!eZ.ProviderController.getProvider(e))throw new eQ(eB,"No Solana provider available.");let i=await u.ConnectionController.sendTransaction({chainNamespace:b.ConstantsUtil.CHAIN.SOLANA,to:t.recipient,value:r,tokenMint:t.tokenMint});if(!i)throw new eQ(eB,"Transaction failed.");return i}catch(e){if(e instanceof eQ)throw e;throw new eQ(eB,`Solana payment failed: ${e}`)}}async function e1({sourceToken:e,toToken:t,amount:r,recipient:i}){let o=u.ConnectionController.parseUnits(r,e.metadata.decimals),a=u.ConnectionController.parseUnits(r,t.metadata.decimals);return Promise.resolve({type:tp,origin:{amount:o?.toString()??"0",currency:e},destination:{amount:a?.toString()??"0",currency:t},fees:[{id:"service",label:"Service Fee",amount:"0",currency:t}],steps:[{requestId:tp,type:"deposit",deposit:{amount:o?.toString()??"0",currency:e.asset,receiver:i}}],timeInSeconds:6})}function e2(e){if(!e)return null;let t=e.steps[0];return t&&t.type===th?t:null}function e5(e,t=0){if(!e)return[];let r=e.steps.filter(e=>e.type===tm),i=r.filter((e,r)=>r+1>t);return r.length>0&&r.length<3?i:[]}let e4=new eG.FetchUtil({baseUrl:S.CoreHelperUtil.getApiUrl(),clientId:null});class e6 extends Error{}function e8(){let{projectId:e,sdkType:t,sdkVersion:r}=m.OptionsController.state;return{projectId:e,st:t||"appkit",sv:r||"html-wagmi-4.2.2"}}async function e7(e,t){let r,i=(r=m.OptionsController.getSnapshot().projectId,`https://rpc.walletconnect.org/v1/json-rpc?projectId=${r}`),{sdkType:o,sdkVersion:a,projectId:n}=m.OptionsController.getSnapshot(),s={jsonrpc:"2.0",id:1,method:e,params:{...t||{},st:o,sv:a,projectId:n}},l=await fetch(i,{method:"POST",body:JSON.stringify(s),headers:{"Content-Type":"application/json"}}),c=await l.json();if(c.error)throw new e6(c.error.message);return c}async function e9(e){return(await e7("reown_getExchanges",e)).result}async function te(e){return(await e7("reown_getExchangePayUrl",e)).result}async function tt(e){return(await e7("reown_getExchangeBuyStatus",e)).result}async function tr(e){let t=f.NumberUtil.bigNumber(e.amount).times(10**e.toToken.metadata.decimals).toString(),{chainId:r,chainNamespace:i}=eN.ParseUtil.parseCaipNetworkId(e.sourceToken.network),{chainId:o,chainNamespace:a}=eN.ParseUtil.parseCaipNetworkId(e.toToken.network),n="native"===e.sourceToken.asset?(0,k.getNativeTokenAddress)(i):e.sourceToken.asset,s="native"===e.toToken.asset?(0,k.getNativeTokenAddress)(a):e.toToken.asset;return await e4.post({path:"/appkit/v1/transfers/quote",body:{user:e.address,originChainId:r.toString(),originCurrency:n,destinationChainId:o.toString(),destinationCurrency:s,recipient:e.recipient,amount:t},params:e8()})}async function ti(e){let t=eR.HelpersUtil.isLowerCaseMatch(e.sourceToken.network,e.toToken.network),r=eR.HelpersUtil.isLowerCaseMatch(e.sourceToken.asset,e.toToken.asset);return t&&r?e1(e):tr(e)}async function to(e){return await e4.get({path:"/appkit/v1/transfers/status",params:{requestId:e.requestId,...e8()}})}async function ta(e){return await e4.get({path:`/appkit/v1/transfers/assets/exchanges/${e}`,params:e8()})}let tn=["eip155","solana"],ts={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}},tl={56:"714",204:"714"};function tc(e,t){let{chainNamespace:r,chainId:i}=eN.ParseUtil.parseCaipNetworkId(e),o=ts[r];if(!o)throw Error(`Unsupported chain namespace for CAIP-19 formatting: ${r}`);let a=o.native.assetNamespace,n=o.native.assetReference;"native"!==t?(a=o.defaultTokenNamespace,n=t):"eip155"===r&&tl[i]&&(n=tl[i]);let s=`${r}:${i}`;return`${s}/${a}:${n}`}function tu(e){let t=f.NumberUtil.bigNumber(e,{safe:!0});return t.lt(.001)?"<0.001":t.round(4).toString()}let td="unknown",tp="direct-transfer",th="deposit",tm="transaction",tw=(0,g.proxy)({paymentAsset:{network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},recipient:"0x0",amount:0,isConfigured:!1,error:null,isPaymentInProgress:!1,exchanges:[],isLoading:!1,openInNewTab:!0,redirectUrl:void 0,payWithExchange:void 0,currentPayment:void 0,analyticsSet:!1,paymentId:void 0,choice:"pay",tokenBalances:{[b.ConstantsUtil.CHAIN.EVM]:[],[b.ConstantsUtil.CHAIN.SOLANA]:[]},isFetchingTokenBalances:!1,selectedPaymentAsset:null,quote:void 0,quoteStatus:"waiting",quoteError:null,isFetchingQuote:!1,selectedExchange:void 0,exchangeUrlForQuote:void 0,requestId:void 0}),tg={state:tw,subscribe:e=>(0,g.subscribe)(tw,()=>e(tw)),subscribeKey:(e,t)=>(0,y.subscribeKey)(tw,e,t),async handleOpenPay(e){this.resetState(),this.setPaymentConfig(e),this.initializeAnalytics(),function(){let{chainNamespace:e}=eN.ParseUtil.parseCaipNetworkId(tg.state.paymentAsset.network);if(!S.CoreHelperUtil.isAddress(tg.state.recipient,e))throw new eQ(eV,`Provide valid recipient address for namespace "${e}"`)}(),await this.prepareTokenLogo(),tw.isConfigured=!0,I.EventsController.sendEvent({type:"track",event:"PAY_MODAL_OPEN",properties:{exchanges:tw.exchanges,configuration:{network:tw.paymentAsset.network,asset:tw.paymentAsset.asset,recipient:tw.recipient,amount:tw.amount}}}),await c.ModalController.open({view:"Pay"})},resetState(){tw.paymentAsset={network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},tw.recipient="0x0",tw.amount=0,tw.isConfigured=!1,tw.error=null,tw.isPaymentInProgress=!1,tw.isLoading=!1,tw.currentPayment=void 0,tw.selectedExchange=void 0,tw.exchangeUrlForQuote=void 0,tw.requestId=void 0},resetQuoteState(){tw.quote=void 0,tw.quoteStatus="waiting",tw.quoteError=null,tw.isFetchingQuote=!1,tw.requestId=void 0},setPaymentConfig(e){if(!e.paymentAsset)throw new eQ(eU);try{tw.choice=e.choice??"pay",tw.paymentAsset=e.paymentAsset,tw.recipient=e.recipient,tw.amount=e.amount,tw.openInNewTab=e.openInNewTab??!0,tw.redirectUrl=e.redirectUrl,tw.payWithExchange=e.payWithExchange,tw.error=null}catch(e){throw new eQ(eU,e.message)}},setSelectedPaymentAsset(e){tw.selectedPaymentAsset=e},setSelectedExchange(e){tw.selectedExchange=e},setRequestId(e){tw.requestId=e},setPaymentInProgress(e){tw.isPaymentInProgress=e},getPaymentAsset:()=>tw.paymentAsset,getExchanges:()=>tw.exchanges,async fetchExchanges(){try{tw.isLoading=!0,tw.exchanges=(await e9({page:0})).exchanges.slice(0,2)}catch(e){throw w.SnackController.showError(eK.UNABLE_TO_GET_EXCHANGES),new eQ(ej)}finally{tw.isLoading=!1}},async getAvailableExchanges(e){try{let t=e?.asset&&e?.network?tc(e.network,e.asset):void 0;return await e9({page:e?.page??0,asset:t,amount:e?.amount?.toString()})}catch(e){throw new eQ(ej)}},async getPayUrl(e,t,r=!1){try{let i=Number(t.amount),o=await te({exchangeId:e,asset:tc(t.network,t.asset),amount:i.toString(),recipient:`${t.network}:${t.recipient}`});return I.EventsController.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{source:"pay",exchange:{id:e},configuration:{network:t.network,asset:t.asset,recipient:t.recipient,amount:i},currentPayment:{type:"exchange",exchangeId:e},headless:r}}),r&&(this.initiatePayment(),I.EventsController.sendEvent({type:"track",event:"PAY_INITIATED",properties:{source:"pay",paymentId:tw.paymentId||td,configuration:{network:t.network,asset:t.asset,recipient:t.recipient,amount:i},currentPayment:{type:"exchange",exchangeId:e}}})),o}catch(e){if(e instanceof Error&&e.message.includes("is not supported"))throw new eQ(eF);throw Error(e.message)}},async generateExchangeUrlForQuote({exchangeId:e,paymentAsset:t,amount:r,recipient:i}){let o=await te({exchangeId:e,asset:tc(t.network,t.asset),amount:r.toString(),recipient:i});tw.exchangeSessionId=o.sessionId,tw.exchangeUrlForQuote=o.url},async openPayUrl(e,t,r=!1){try{let i=await this.getPayUrl(e.exchangeId,t,r);if(!i)throw new eQ(eq);let o=e.openInNewTab??!0;return S.CoreHelperUtil.openHref(i.url,o?"_blank":"_self"),i}catch(e){throw e instanceof eQ?tw.error=e.message:tw.error=eK.GENERIC_PAYMENT_ERROR,new eQ(eq)}},async onTransfer({chainNamespace:e,fromAddress:t,toAddress:r,amount:i,paymentAsset:o}){if(tw.currentPayment={type:"wallet",status:"IN_PROGRESS"},!tw.isPaymentInProgress)try{this.initiatePayment();let a=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===o.network);if(!a)throw Error("Target network not found");let n=s.ChainController.state.activeCaipNetwork;switch(!eR.HelpersUtil.isLowerCaseMatch(n?.caipNetworkId,a.caipNetworkId)&&await s.ChainController.switchActiveNetwork(a),e){case b.ConstantsUtil.CHAIN.EVM:"native"===o.asset&&(tw.currentPayment.result=await eJ(o,e,{recipient:r,amount:i,fromAddress:t})),o.asset.startsWith("0x")&&(tw.currentPayment.result=await e0(o,{recipient:r,amount:i,fromAddress:t})),tw.currentPayment.status="SUCCESS";break;case b.ConstantsUtil.CHAIN.SOLANA:tw.currentPayment.result=await e3(e,{recipient:r,amount:i,fromAddress:t,tokenMint:"native"===o.asset?void 0:o.asset}),tw.currentPayment.status="SUCCESS";break;default:throw new eQ(eL)}}catch(e){throw e instanceof eQ?tw.error=e.message:tw.error=eK.GENERIC_PAYMENT_ERROR,tw.currentPayment.status="FAILED",w.SnackController.showError(tw.error),e}finally{tw.isPaymentInProgress=!1}},async onSendTransaction(e){try{let{namespace:t,transactionStep:r}=e;tg.initiatePayment();let i=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===tw.paymentAsset?.network);if(!i)throw Error("Target network not found");let o=s.ChainController.state.activeCaipNetwork;if(eR.HelpersUtil.isLowerCaseMatch(o?.caipNetworkId,i.caipNetworkId)||await s.ChainController.switchActiveNetwork(i),t===b.ConstantsUtil.CHAIN.EVM){let{from:e,to:i,data:o,value:a}=r.transaction;await u.ConnectionController.sendTransaction({address:e,to:i,data:o,value:BigInt(a),chainNamespace:t})}else if(t===b.ConstantsUtil.CHAIN.SOLANA){let{instructions:e}=r.transaction;await u.ConnectionController.writeSolanaTransaction({instructions:e})}}catch(e){throw e instanceof eQ?tw.error=e.message:tw.error=eK.GENERIC_PAYMENT_ERROR,w.SnackController.showError(tw.error),e}finally{tw.isPaymentInProgress=!1}},getExchangeById:e=>tw.exchanges.find(t=>t.id===e),validatePayConfig(e){let{paymentAsset:t,recipient:r,amount:i}=e;if(!t)throw new eQ(eU);if(!r)throw new eQ(eO);if(!t.asset)throw new eQ(eD);if(null==i||i<=0)throw new eQ(eW)},async handlePayWithExchange(e){try{tw.currentPayment={type:"exchange",exchangeId:e};let{network:t,asset:r}=tw.paymentAsset,i={network:t,asset:r,amount:tw.amount,recipient:tw.recipient},o=await this.getPayUrl(e,i);if(!o)throw new eQ(ez);return tw.currentPayment.sessionId=o.sessionId,tw.currentPayment.status="IN_PROGRESS",tw.currentPayment.exchangeId=e,this.initiatePayment(),{url:o.url,openInNewTab:tw.openInNewTab}}catch(e){return e instanceof eQ?tw.error=e.message:tw.error=eK.GENERIC_PAYMENT_ERROR,tw.isPaymentInProgress=!1,w.SnackController.showError(tw.error),null}},async getBuyStatus(e,t){try{let r=await tt({sessionId:t,exchangeId:e});return("SUCCESS"===r.status||"FAILED"===r.status)&&I.EventsController.sendEvent({type:"track",event:"SUCCESS"===r.status?"PAY_SUCCESS":"PAY_ERROR",properties:{message:"FAILED"===r.status?S.CoreHelperUtil.parseError(tw.error):void 0,source:"pay",paymentId:tw.paymentId||td,configuration:{network:tw.paymentAsset.network,asset:tw.paymentAsset.asset,recipient:tw.recipient,amount:tw.amount},currentPayment:{type:"exchange",exchangeId:tw.currentPayment?.exchangeId,sessionId:tw.currentPayment?.sessionId,result:r.txHash}}}),r}catch(e){throw new eQ(e_)}},async fetchTokensFromEOA({caipAddress:e,caipNetwork:t,namespace:r}){if(!e)return[];let{address:i}=eN.ParseUtil.parseCaipAddress(e),o=t;return r===b.ConstantsUtil.CHAIN.EVM&&(o=void 0),await x.BalanceUtil.getMyTokensWithBalance({address:i,caipNetwork:o})},async fetchTokensFromExchange(){if(!tw.selectedExchange)return[];let e=Object.values((await ta(tw.selectedExchange.id)).assets).flat();return await Promise.all(e.map(async e=>{let t={chainId:e.network,address:`${e.network}:${e.asset}`,symbol:e.metadata.symbol,name:e.metadata.name,iconUrl:e.metadata.logoURI||"",price:0,quantity:{numeric:"0",decimals:e.metadata.decimals.toString()}},{chainNamespace:r}=eN.ParseUtil.parseCaipNetworkId(t.chainId),i=t.address;if(S.CoreHelperUtil.isCaipAddress(i)){let{address:e}=eN.ParseUtil.parseCaipAddress(i);i=e}return t.iconUrl=await et.AssetUtil.getImageByToken(i??"",r).catch(()=>void 0)??"",t}))},async fetchTokens({caipAddress:e,caipNetwork:t,namespace:r}){try{tw.isFetchingTokenBalances=!0;let i=tw.selectedExchange?this.fetchTokensFromExchange():this.fetchTokensFromEOA({caipAddress:e,caipNetwork:t,namespace:r}),o=await i;tw.tokenBalances={...tw.tokenBalances,[r]:o}}catch(t){let e=t instanceof Error?t.message:"Unable to get token balances";w.SnackController.showError(e)}finally{tw.isFetchingTokenBalances=!1}},async fetchQuote({amount:e,address:t,sourceToken:r,toToken:i,recipient:o}){try{tg.resetQuoteState(),tw.isFetchingQuote=!0;let a=await ti({amount:e,address:tw.selectedExchange?void 0:t,sourceToken:r,toToken:i,recipient:o});if(tw.selectedExchange){let e=e2(a);if(e){let t=`${r.network}:${e.deposit.receiver}`,i=f.NumberUtil.formatNumber(e.deposit.amount,{decimals:r.metadata.decimals??0,round:8});await tg.generateExchangeUrlForQuote({exchangeId:tw.selectedExchange.id,paymentAsset:r,amount:i.toString(),recipient:t})}}tw.quote=a}catch(t){let e=eK.UNABLE_TO_GET_QUOTE;if(t instanceof Error&&t.cause&&t.cause instanceof Response)try{let r=await t.cause.json();r.error&&"string"==typeof r.error&&(e=r.error)}catch{}throw tw.quoteError=e,w.SnackController.showError(e),new eQ(eM)}finally{tw.isFetchingQuote=!1}},async fetchQuoteStatus({requestId:e}){try{if(e===tp){let e=tw.selectedExchange,t=tw.exchangeSessionId;if(e&&t){switch((await this.getBuyStatus(e.id,t)).status){case"IN_PROGRESS":case"UNKNOWN":default:tw.quoteStatus="waiting";break;case"SUCCESS":tw.quoteStatus="success",tw.isPaymentInProgress=!1;break;case"FAILED":tw.quoteStatus="failure",tw.isPaymentInProgress=!1}return}tw.quoteStatus="success";return}let{status:t}=await to({requestId:e});tw.quoteStatus=t}catch{throw tw.quoteStatus="failure",new eQ(eH)}},initiatePayment(){tw.isPaymentInProgress=!0,tw.paymentId=crypto.randomUUID()},initializeAnalytics(){tw.analyticsSet||(tw.analyticsSet=!0,this.subscribeKey("isPaymentInProgress",e=>{if(tw.currentPayment?.status&&"UNKNOWN"!==tw.currentPayment.status){let e={IN_PROGRESS:"PAY_INITIATED",SUCCESS:"PAY_SUCCESS",FAILED:"PAY_ERROR"}[tw.currentPayment.status];I.EventsController.sendEvent({type:"track",event:e,properties:{message:"FAILED"===tw.currentPayment.status?S.CoreHelperUtil.parseError(tw.error):void 0,source:"pay",paymentId:tw.paymentId||td,configuration:{network:tw.paymentAsset.network,asset:tw.paymentAsset.asset,recipient:tw.recipient,amount:tw.amount},currentPayment:{type:tw.currentPayment.type,exchangeId:tw.currentPayment.exchangeId,sessionId:tw.currentPayment.sessionId,result:tw.currentPayment.result}}})}}))},async prepareTokenLogo(){if(!tw.paymentAsset.metadata.logoURI)try{let{chainNamespace:e}=eN.ParseUtil.parseCaipNetworkId(tw.paymentAsset.network),t=await et.AssetUtil.getImageByToken(tw.paymentAsset.asset,e);tw.paymentAsset.metadata.logoURI=t}catch{}}},ty=B.css`
  wui-separator {
    margin: var(--apkt-spacing-3) calc(var(--apkt-spacing-3) * -1) var(--apkt-spacing-2)
      calc(var(--apkt-spacing-3) * -1);
    width: calc(100% + var(--apkt-spacing-3) * 2);
  }

  .token-display {
    padding: var(--apkt-spacing-3) var(--apkt-spacing-3);
    border-radius: var(--apkt-borderRadius-5);
    background-color: var(--apkt-tokens-theme-backgroundPrimary);
    margin-top: var(--apkt-spacing-3);
    margin-bottom: var(--apkt-spacing-3);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--apkt-spacing-2);
  }

  .left-image-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:e})=>e.round};
    width: 40px;
    height: 40px;
  }

  .chain-image {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:e})=>e.round};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .payment-methods-container {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:e})=>e[8]};
    border-top-left-radius: ${({borderRadius:e})=>e[8]};
  }
`;var tf=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let tb=class extends ew.LitElement{constructor(){super(),this.unsubscribe=[],this.amount=tg.state.amount,this.namespace=void 0,this.paymentAsset=tg.state.paymentAsset,this.activeConnectorIds=l.ConnectorController.state.activeConnectorIds,this.caipAddress=void 0,this.exchanges=tg.state.exchanges,this.isLoading=tg.state.isLoading,this.initializeNamespace(),this.unsubscribe.push(tg.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(l.ConnectorController.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(tg.subscribeKey("exchanges",e=>this.exchanges=e)),this.unsubscribe.push(tg.subscribeKey("isLoading",e=>this.isLoading=e)),tg.fetchExchanges(),tg.setSelectedExchange(void 0)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return r.html`
      <wui-flex flexDirection="column">
        ${this.paymentDetailsTemplate()} ${this.paymentMethodsTemplate()}
      </wui-flex>
    `}paymentMethodsTemplate(){return r.html`
      <wui-flex flexDirection="column" padding="3" gap="2" class="payment-methods-container">
        ${this.payWithWalletTemplate()} ${this.templateSeparator()}
        ${this.templateExchangeOptions()}
      </wui-flex>
    `}initializeNamespace(){let e=s.ChainController.state.activeChain;this.namespace=e,this.caipAddress=s.ChainController.getAccountData(e)?.caipAddress,this.unsubscribe.push(s.ChainController.subscribeChainProp("accountState",e=>{this.caipAddress=e?.caipAddress},e))}paymentDetailsTemplate(){let e=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===this.paymentAsset.network);return r.html`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        .padding=${["6","8","6","8"]}
        gap="2"
      >
        <wui-flex alignItems="center" gap="1">
          <wui-text variant="h1-regular" color="primary">
            ${tu(this.amount||"0")}
          </wui-text>

          <wui-flex flexDirection="column">
            <wui-text variant="h6-regular" color="secondary">
              ${this.paymentAsset.metadata.symbol||"Unknown"}
            </wui-text>
            <wui-text variant="md-medium" color="secondary"
              >on ${e?.name||"Unknown"}</wui-text
            >
          </wui-flex>
        </wui-flex>

        <wui-flex class="left-image-container">
          <wui-image
            src=${(0,a.ifDefined)(this.paymentAsset.metadata.logoURI)}
            class="token-image"
          ></wui-image>
          <wui-image
            src=${(0,a.ifDefined)(et.AssetUtil.getNetworkImage(e))}
            class="chain-image"
          ></wui-image>
        </wui-flex>
      </wui-flex>
    `}payWithWalletTemplate(){return!function(e){let{chainNamespace:t}=eN.ParseUtil.parseCaipNetworkId(e);return tn.includes(t)}(this.paymentAsset.network)?r.html``:this.caipAddress?this.connectedWalletTemplate():this.disconnectedWalletTemplate()}connectedWalletTemplate(){let{name:e,image:t}=this.getWalletProperties({namespace:this.namespace});return r.html`
      <wui-flex flexDirection="column" gap="3">
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${this.onWalletPayment}
          .boxed=${!1}
          ?chevron=${!0}
          ?fullSize=${!1}
          ?rounded=${!0}
          data-testid="wallet-payment-option"
          imageSrc=${(0,a.ifDefined)(t)}
          imageSize="3xl"
        >
          <wui-text variant="lg-regular" color="primary">Pay with ${e}</wui-text>
        </wui-list-item>

        <wui-list-item
          type="secondary"
          icon="power"
          iconColor="error"
          @click=${this.onDisconnect}
          data-testid="disconnect-button"
          ?chevron=${!1}
          boxColor="foregroundSecondary"
        >
          <wui-text variant="lg-regular" color="secondary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>
    `}disconnectedWalletTemplate(){return r.html`<wui-list-item
      type="secondary"
      boxColor="foregroundSecondary"
      variant="icon"
      iconColor="default"
      iconVariant="overlay"
      icon="wallet"
      @click=${this.onWalletPayment}
      ?chevron=${!0}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="lg-regular" color="primary">Pay with wallet</wui-text>
    </wui-list-item>`}templateExchangeOptions(){if(this.isLoading)return r.html`<wui-flex justifyContent="center" alignItems="center">
        <wui-loading-spinner size="md"></wui-loading-spinner>
      </wui-flex>`;let e=this.exchanges.filter(e=>{var t;let r;return(t=this.paymentAsset,(r=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===t.network))&&r.testnet)?e.id===eY:e.id!==eY});return 0===e.length?r.html`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="md-medium" color="primary">No exchanges available</wui-text>
      </wui-flex>`:e.map(e=>r.html`
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${()=>this.onExchangePayment(e)}
          data-testid="exchange-option-${e.id}"
          ?chevron=${!0}
          imageSrc=${(0,a.ifDefined)(e.imageUrl)}
        >
          <wui-text flexGrow="1" variant="lg-regular" color="primary">
            Pay with ${e.name}
          </wui-text>
        </wui-list-item>
      `)}templateSeparator(){return r.html`<wui-separator text="or" bgColor="secondary"></wui-separator>`}async onWalletPayment(){if(!this.namespace)throw Error("Namespace not found");this.caipAddress?d.RouterController.push("PayQuote"):(await l.ConnectorController.connect(),await c.ModalController.open({view:"PayQuote"}))}onExchangePayment(e){tg.setSelectedExchange(e),d.RouterController.push("PayQuote")}async onDisconnect(){try{await u.ConnectionController.disconnect(),await c.ModalController.open({view:"Pay"})}catch{console.error("Failed to disconnect"),w.SnackController.showError("Failed to disconnect")}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};let t=this.activeConnectorIds[e];if(!t)return{name:void 0,image:void 0};let r=l.ConnectorController.getConnector({id:t,namespace:e});if(!r)return{name:void 0,image:void 0};let i=et.AssetUtil.getConnectorImage(r);return{name:r.name,image:i}}};tb.styles=ty,tf([(0,o.state)()],tb.prototype,"amount",void 0),tf([(0,o.state)()],tb.prototype,"namespace",void 0),tf([(0,o.state)()],tb.prototype,"paymentAsset",void 0),tf([(0,o.state)()],tb.prototype,"activeConnectorIds",void 0),tf([(0,o.state)()],tb.prototype,"caipAddress",void 0),tf([(0,o.state)()],tb.prototype,"exchanges",void 0),tf([(0,o.state)()],tb.prototype,"isLoading",void 0),tb=tf([(0,z.customElement)("w3m-pay-view")],tb);var tv=t;e.i(53976);var tx=e.i(93090),tk=t;let tC=B.css`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-container {
    position: relative;
    width: var(--pulse-size);
    height: var(--pulse-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--pulse-color);
    opacity: 0;
    animation: pulse var(--pulse-duration, 2s) ease-out infinite;
  }

  .pulse-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.5);
      opacity: var(--pulse-opacity, 0.3);
    }
    50% {
      opacity: calc(var(--pulse-opacity, 0.3) * 0.5);
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;var tS=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let tT={"accent-primary":B.vars.tokens.core.backgroundAccentPrimary},tA=class extends tk.LitElement{constructor(){super(...arguments),this.rings=3,this.duration=2,this.opacity=.3,this.size="200px",this.variant="accent-primary"}render(){let e=tT[this.variant];this.style.cssText=`
      --pulse-size: ${this.size};
      --pulse-duration: ${this.duration}s;
      --pulse-color: ${e};
      --pulse-opacity: ${this.opacity};
    `;let t=Array.from({length:this.rings},(e,t)=>this.renderRing(t,this.rings));return r.html`
      <div class="pulse-container">
        <div class="pulse-rings">${t}</div>
        <div class="pulse-content">
          <slot></slot>
        </div>
      </div>
    `}renderRing(e,t){let i=e/t*this.duration,o=`animation-delay: ${i}s;`;return r.html`<div class="pulse-ring" style=${o}></div>`}};tA.styles=[L.resetStyles,tC],tS([(0,i.property)({type:Number})],tA.prototype,"rings",void 0),tS([(0,i.property)({type:Number})],tA.prototype,"duration",void 0),tS([(0,i.property)({type:Number})],tA.prototype,"opacity",void 0),tS([(0,i.property)()],tA.prototype,"size",void 0),tS([(0,i.property)()],tA.prototype,"variant",void 0),tA=tS([(0,z.customElement)("wui-pulse")],tA);let tP=[{id:"received",title:"Receiving funds",icon:"dollar"},{id:"processing",title:"Swapping asset",icon:"recycleHorizontal"},{id:"sending",title:"Sending asset to the recipient address",icon:"send"}],t$=["success","submitted","failure","timeout","refund"],tE=B.css`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }

  .token-badge-container {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: ${({borderRadius:e})=>e[4]};
    z-index: 3;
    min-width: 105px;
  }

  .token-badge-container.loading {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 3px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .token-badge-container.success {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 3px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .token-image-container {
    position: relative;
  }

  .token-image {
    border-radius: ${({borderRadius:e})=>e.round};
    width: 64px;
    height: 64px;
  }

  .token-image.success {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .token-image.error {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .token-image.loading {
    background: ${({colors:e})=>e.accent010};
  }

  .token-image wui-icon {
    width: 32px;
    height: 32px;
  }

  .token-badge {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  .token-badge wui-text {
    white-space: nowrap;
  }

  .payment-lifecycle-container {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:e})=>e[6]};
    border-top-left-radius: ${({borderRadius:e})=>e[6]};
  }

  .payment-step-badge {
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  .payment-step-badge.loading {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .payment-step-badge.error {
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  .payment-step-badge.success {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }

  .step-icon-container {
    position: relative;
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:e})=>e.round};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .step-icon-box {
    position: absolute;
    right: -4px;
    bottom: -1px;
    padding: 2px;
    border-radius: ${({borderRadius:e})=>e.round};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .step-icon-box.success {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }
`;var tI=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let tN={received:["pending","success","submitted"],processing:["success","submitted"],sending:["success","submitted"]},tR=class extends tv.LitElement{constructor(){super(),this.unsubscribe=[],this.pollingInterval=null,this.paymentAsset=tg.state.paymentAsset,this.quoteStatus=tg.state.quoteStatus,this.quote=tg.state.quote,this.amount=tg.state.amount,this.namespace=void 0,this.caipAddress=void 0,this.profileName=null,this.activeConnectorIds=l.ConnectorController.state.activeConnectorIds,this.selectedExchange=tg.state.selectedExchange,this.initializeNamespace(),this.unsubscribe.push(tg.subscribeKey("quoteStatus",e=>this.quoteStatus=e),tg.subscribeKey("quote",e=>this.quote=e),l.ConnectorController.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e),tg.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}connectedCallback(){super.connectedCallback(),this.startPolling()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.unsubscribe.forEach(e=>e())}render(){return r.html`
      <wui-flex flexDirection="column" .padding=${["3","0","0","0"]} gap="2">
        ${this.tokenTemplate()} ${this.paymentTemplate()} ${this.paymentLifecycleTemplate()}
      </wui-flex>
    `}tokenTemplate(){let e=tu(this.amount||"0"),t=this.paymentAsset.metadata.symbol??"Unknown",i=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===this.paymentAsset.network),o="failure"===this.quoteStatus||"timeout"===this.quoteStatus||"refund"===this.quoteStatus;return"success"===this.quoteStatus||"submitted"===this.quoteStatus?r.html`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image success">
          <wui-icon name="checkmark" color="success" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:o?r.html`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image error">
          <wui-icon name="close" color="error" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:r.html`
      <wui-flex alignItems="center" justifyContent="center">
        <wui-flex class="token-image-container">
          <wui-pulse size="125px" rings="3" duration="4" opacity="0.5" variant="accent-primary">
            <wui-flex justifyContent="center" alignItems="center" class="token-image loading">
              <wui-icon name="paperPlaneTitle" color="accent-primary" size="inherit"></wui-icon>
            </wui-flex>
          </wui-pulse>

          <wui-flex
            justifyContent="center"
            alignItems="center"
            class="token-badge-container loading"
          >
            <wui-flex
              alignItems="center"
              justifyContent="center"
              gap="01"
              padding="1"
              class="token-badge"
            >
              <wui-image
                src=${(0,a.ifDefined)(et.AssetUtil.getNetworkImage(i))}
                class="chain-image"
                size="mdl"
              ></wui-image>

              <wui-text variant="lg-regular" color="primary">${e} ${t}</wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}paymentTemplate(){return r.html`
      <wui-flex flexDirection="column" gap="2" .padding=${["0","6","0","6"]}>
        ${this.renderPayment()}
        <wui-separator></wui-separator>
        ${this.renderWallet()}
      </wui-flex>
    `}paymentLifecycleTemplate(){let e=this.getStepsWithStatus();return r.html`
      <wui-flex flexDirection="column" padding="4" gap="2" class="payment-lifecycle-container">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">PAYMENT CYCLE</wui-text>

          ${this.renderPaymentCycleBadge()}
        </wui-flex>

        <wui-flex flexDirection="column" gap="5" .padding=${["2","0","2","0"]}>
          ${e.map(e=>this.renderStep(e))}
        </wui-flex>
      </wui-flex>
    `}renderPaymentCycleBadge(){let e="failure"===this.quoteStatus||"timeout"===this.quoteStatus||"refund"===this.quoteStatus,t="success"===this.quoteStatus||"submitted"===this.quoteStatus;if(e)return r.html`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge error"
          gap="1"
        >
          <wui-icon name="close" color="error" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="error">Failed</wui-text>
        </wui-flex>
      `;if(t)return r.html`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge success"
          gap="1"
        >
          <wui-icon name="checkmark" color="success" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="success">Completed</wui-text>
        </wui-flex>
      `;let i=this.quote?.timeInSeconds??0;return r.html`
      <wui-flex alignItems="center" justifyContent="space-between" gap="3">
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge loading"
          gap="1"
        >
          <wui-icon name="clock" color="default" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="primary">Est. ${i} sec</wui-text>
        </wui-flex>

        <wui-icon name="chevronBottom" color="default" size="xxs"></wui-icon>
      </wui-flex>
    `}renderPayment(){let e=s.ChainController.getAllRequestedCaipNetworks().find(e=>{let t=this.quote?.origin.currency.network;if(!t)return!1;let{chainId:r}=eN.ParseUtil.parseCaipNetworkId(t);return eR.HelpersUtil.isLowerCaseMatch(e.id.toString(),r.toString())}),t=tu(f.NumberUtil.formatNumber(this.quote?.origin.amount||"0",{decimals:this.quote?.origin.currency.metadata.decimals??0}).toString()),i=this.quote?.origin.currency.metadata.symbol??"Unknown";return r.html`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Payment Method</wui-text>

        <wui-flex flexDirection="column" alignItems="flex-end" gap="1">
          <wui-flex alignItems="center" gap="01">
            <wui-text variant="lg-regular" color="primary">${t}</wui-text>
            <wui-text variant="lg-regular" color="secondary">${i}</wui-text>
          </wui-flex>

          <wui-flex alignItems="center" gap="1">
            <wui-text variant="md-regular" color="secondary">on</wui-text>
            <wui-image
              src=${(0,a.ifDefined)(et.AssetUtil.getNetworkImage(e))}
              size="xs"
            ></wui-image>
            <wui-text variant="md-regular" color="secondary">${e?.name}</wui-text>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}renderWallet(){return r.html`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary"
          >${this.selectedExchange?"Exchange":"Wallet"}</wui-text
        >

        ${this.renderWalletText()}
      </wui-flex>
    `}renderWalletText(){let{image:e}=this.getWalletProperties({namespace:this.namespace}),{address:t}=this.caipAddress?eN.ParseUtil.parseCaipAddress(this.caipAddress):{},i=this.selectedExchange?.name;return this.selectedExchange?r.html`
        <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
          <wui-text variant="lg-regular" color="primary">${i}</wui-text>
          <wui-image src=${(0,a.ifDefined)(this.selectedExchange.imageUrl)} size="mdl"></wui-image>
        </wui-flex>
      `:r.html`
      <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
        <wui-text variant="lg-regular" color="primary">
          ${W.UiHelperUtil.getTruncateString({string:this.profileName||t||i||"",charsStart:this.profileName?16:4,charsEnd:6*!this.profileName,truncate:this.profileName?"end":"middle"})}
        </wui-text>

        <wui-image src=${(0,a.ifDefined)(e)} size="mdl"></wui-image>
      </wui-flex>
    `}getStepsWithStatus(){return"failure"===this.quoteStatus||"timeout"===this.quoteStatus||"refund"===this.quoteStatus?tP.map(e=>({...e,status:"failed"})):tP.map(e=>{let t=(tN[e.id]??[]).includes(this.quoteStatus)?"completed":"pending";return{...e,status:t}})}renderStep({title:e,icon:t,status:i}){return r.html`
      <wui-flex alignItems="center" gap="3">
        <wui-flex justifyContent="center" alignItems="center" class="step-icon-container">
          <wui-icon name=${t} color="default" size="mdl"></wui-icon>

          <wui-flex alignItems="center" justifyContent="center" class=${(0,tx.classMap)({"step-icon-box":!0,success:"completed"===i})}>
            ${this.renderStatusIndicator(i)}
          </wui-flex>
        </wui-flex>

        <wui-text variant="md-regular" color="primary">${e}</wui-text>
      </wui-flex>
    `}renderStatusIndicator(e){return"completed"===e?r.html`<wui-icon size="sm" color="success" name="checkmark"></wui-icon>`:"failed"===e?r.html`<wui-icon size="sm" color="error" name="close"></wui-icon>`:"pending"===e?r.html`<wui-loading-spinner color="accent-primary" size="sm"></wui-loading-spinner>`:null}startPolling(){this.pollingInterval||(this.fetchQuoteStatus(),this.pollingInterval=setInterval(()=>{this.fetchQuoteStatus()},3e3))}stopPolling(){this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null)}async fetchQuoteStatus(){let e=tg.state.requestId;if(!e||t$.includes(this.quoteStatus))this.stopPolling();else try{await tg.fetchQuoteStatus({requestId:e}),t$.includes(this.quoteStatus)&&this.stopPolling()}catch{this.stopPolling()}}initializeNamespace(){let e=s.ChainController.state.activeChain;this.namespace=e,this.caipAddress=s.ChainController.getAccountData(e)?.caipAddress,this.profileName=s.ChainController.getAccountData(e)?.profileName??null,this.unsubscribe.push(s.ChainController.subscribeChainProp("accountState",e=>{this.caipAddress=e?.caipAddress,this.profileName=e?.profileName??null},e))}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};let t=this.activeConnectorIds[e];if(!t)return{name:void 0,image:void 0};let r=l.ConnectorController.getConnector({id:t,namespace:e});if(!r)return{name:void 0,image:void 0};let i=et.AssetUtil.getConnectorImage(r);return{name:r.name,image:i}}};tR.styles=tE,tI([(0,o.state)()],tR.prototype,"paymentAsset",void 0),tI([(0,o.state)()],tR.prototype,"quoteStatus",void 0),tI([(0,o.state)()],tR.prototype,"quote",void 0),tI([(0,o.state)()],tR.prototype,"amount",void 0),tI([(0,o.state)()],tR.prototype,"namespace",void 0),tI([(0,o.state)()],tR.prototype,"caipAddress",void 0),tI([(0,o.state)()],tR.prototype,"profileName",void 0),tI([(0,o.state)()],tR.prototype,"activeConnectorIds",void 0),tI([(0,o.state)()],tR.prototype,"selectedExchange",void 0),tR=tI([(0,z.customElement)("w3m-pay-loading-view")],tR);var tU=t,tO=t;let tD=B.css`
  button {
    display: flex;
    align-items: center;
    height: 40px;
    padding: ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[4]};
    column-gap: ${({spacing:e})=>e[1]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  wui-image,
  .icon-box {
    width: ${({spacing:e})=>e[6]};
    height: ${({spacing:e})=>e[6]};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-text {
    flex: 1;
  }

  .icon-box {
    position: relative;
  }

  .icon-box[data-active='true'] {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .circle {
    position: absolute;
    left: 16px;
    top: 15px;
    width: 8px;
    height: 8px;
    background-color: ${({tokens:e})=>e.core.textSuccess};
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: 50%;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }
`;var tW=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let tz=class extends tO.LitElement{constructor(){super(...arguments),this.address="",this.profileName="",this.alt="",this.imageSrc="",this.icon=void 0,this.iconSize="md",this.enableGreenCircle=!0,this.loading=!1,this.charsStart=4,this.charsEnd=6}render(){return r.html`
      <button>
        ${this.leftImageTemplate()} ${this.textTemplate()} ${this.rightImageTemplate()}
      </button>
    `}leftImageTemplate(){let e=this.icon?r.html`<wui-icon
          size=${(0,a.ifDefined)(this.iconSize)}
          color="default"
          name=${this.icon}
          class="icon"
        ></wui-icon>`:r.html`<wui-image src=${this.imageSrc} alt=${this.alt}></wui-image>`;return r.html`
      <wui-flex
        alignItems="center"
        justifyContent="center"
        class="icon-box"
        data-active=${!!this.icon}
      >
        ${e}
        ${this.enableGreenCircle?r.html`<wui-flex class="circle"></wui-flex>`:null}
      </wui-flex>
    `}textTemplate(){return r.html`
      <wui-text variant="lg-regular" color="primary">
        ${W.UiHelperUtil.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?16:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?"end":"middle"})}
      </wui-text>
    `}rightImageTemplate(){return r.html`<wui-icon name="chevronBottom" size="sm" color="default"></wui-icon>`}};tz.styles=[L.resetStyles,L.elementStyles,tD],tW([(0,i.property)()],tz.prototype,"address",void 0),tW([(0,i.property)()],tz.prototype,"profileName",void 0),tW([(0,i.property)()],tz.prototype,"alt",void 0),tW([(0,i.property)()],tz.prototype,"imageSrc",void 0),tW([(0,i.property)()],tz.prototype,"icon",void 0),tW([(0,i.property)()],tz.prototype,"iconSize",void 0),tW([(0,i.property)({type:Boolean})],tz.prototype,"enableGreenCircle",void 0),tW([(0,i.property)({type:Boolean})],tz.prototype,"loading",void 0),tW([(0,i.property)({type:Number})],tz.prototype,"charsStart",void 0),tW([(0,i.property)({type:Number})],tz.prototype,"charsEnd",void 0),tz=tW([(0,z.customElement)("wui-wallet-switch")],tz);var tL=t;e.i(80313);var tB=e.i(15193);let tj=tB.css`
  :host {
    display: block;
  }
`,tF=class extends tL.LitElement{render(){return r.html`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-shimmer width="60px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Network Fee</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-shimmer
              width="75px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>

            <wui-flex alignItems="center" gap="01">
              <wui-shimmer width="14px" height="14px" rounded variant="light"></wui-shimmer>
              <wui-shimmer
                width="49px"
                height="14px"
                borderRadius="4xs"
                variant="light"
              ></wui-shimmer>
            </wui-flex>
          </wui-flex>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Service Fee</wui-text>
          <wui-shimmer width="75px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>
      </wui-flex>
    `}};tF.styles=[tj],tF=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n}([(0,z.customElement)("w3m-pay-fees-skeleton")],tF);var tq=t;let t_=B.css`
  :host {
    display: block;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }
`;var tM=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let tH=class extends tq.LitElement{constructor(){super(),this.unsubscribe=[],this.quote=tg.state.quote,this.unsubscribe.push(tg.subscribeKey("quote",e=>this.quote=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=f.NumberUtil.formatNumber(this.quote?.origin.amount||"0",{decimals:this.quote?.origin.currency.metadata.decimals??0,round:6}).toString();return r.html`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-text variant="md-regular" color="primary">
            ${e} ${this.quote?.origin.currency.metadata.symbol||"Unknown"}
          </wui-text>
        </wui-flex>

        ${this.quote&&this.quote.fees.length>0?this.quote.fees.map(e=>this.renderFee(e)):null}
      </wui-flex>
    `}renderFee(e){let t="network"===e.id,i=f.NumberUtil.formatNumber(e.amount||"0",{decimals:e.currency.metadata.decimals??0,round:6}).toString();if(t){let t=s.ChainController.getAllRequestedCaipNetworks().find(t=>eR.HelpersUtil.isLowerCaseMatch(t.caipNetworkId,e.currency.network));return r.html`
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-text variant="md-regular" color="primary">
              ${i} ${e.currency.metadata.symbol||"Unknown"}
            </wui-text>

            <wui-flex alignItems="center" gap="01">
              <wui-image
                src=${(0,a.ifDefined)(et.AssetUtil.getNetworkImage(t))}
                size="xs"
              ></wui-image>
              <wui-text variant="sm-regular" color="secondary">
                ${t?.name||"Unknown"}
              </wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      `}return r.html`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>
        <wui-text variant="md-regular" color="primary">
          ${i} ${e.currency.metadata.symbol||"Unknown"}
        </wui-text>
      </wui-flex>
    `}};tH.styles=[t_],tM([(0,o.state)()],tH.prototype,"quote",void 0),tH=tM([(0,z.customElement)("w3m-pay-fees")],tH);var tV=t;let tK=B.css`
  :host {
    display: block;
    width: 100%;
  }

  .disabled-container {
    padding: ${({spacing:e})=>e[2]};
    min-height: 168px;
  }

  wui-icon {
    width: ${({spacing:e})=>e[8]};
    height: ${({spacing:e})=>e[8]};
  }

  wui-flex > wui-text {
    max-width: 273px;
  }
`;var tQ=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let tG=class extends tV.LitElement{constructor(){super(),this.unsubscribe=[],this.selectedExchange=tg.state.selectedExchange,this.unsubscribe.push(tg.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=!!this.selectedExchange;return r.html`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
        class="disabled-container"
      >
        <wui-icon name="coins" color="default" size="inherit"></wui-icon>

        <wui-text variant="md-regular" color="primary" align="center">
          You don't have enough funds to complete this transaction
        </wui-text>

        ${e?null:r.html`<wui-button
              size="md"
              variant="neutral-secondary"
              @click=${this.dispatchConnectOtherWalletEvent.bind(this)}
              >Connect other wallet</wui-button
            >`}
      </wui-flex>
    `}dispatchConnectOtherWalletEvent(){this.dispatchEvent(new CustomEvent("connectOtherWallet",{detail:!0,bubbles:!0,composed:!0}))}};tG.styles=[tK],tQ([(0,i.property)({type:Array})],tG.prototype,"selectedExchange",void 0),tG=tQ([(0,z.customElement)("w3m-pay-options-empty")],tG);var tY=t;let tX=B.css`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: ${({spacing:e})=>e[3]};
    min-height: 60px;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .chain-image {
    position: absolute;
    bottom: -3px;
    right: -5px;
    border: 2px solid ${({tokens:e})=>e.theme.foregroundSecondary};
  }
`,tZ=class extends tY.LitElement{render(){return r.html`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.renderOptionEntry()} ${this.renderOptionEntry()} ${this.renderOptionEntry()}
      </wui-flex>
    `}renderOptionEntry(){return r.html`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-shimmer
              width="32px"
              height="32px"
              rounded
              variant="light"
              class="token-image"
            ></wui-shimmer>
            <wui-shimmer
              width="16px"
              height="16px"
              rounded
              variant="light"
              class="chain-image"
            ></wui-shimmer>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-shimmer
              width="74px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
            <wui-shimmer
              width="46px"
              height="14px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}};tZ.styles=[tX],tZ=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n}([(0,z.customElement)("w3m-pay-options-skeleton")],tZ);var tJ=t;let t0={interpolate(e,t,r){if(2!==e.length||2!==t.length)throw Error("inputRange and outputRange must be an array of length 2");let i=e[0]||0,o=e[1]||0,a=t[0]||0,n=t[1]||0;return r<i?a:r>o?n:(n-a)/(o-i)*(r-i)+a}},t3=B.css`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    mask-image: var(--options-mask-image);
    -webkit-mask-image: var(--options-mask-image);
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    cursor: pointer;
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: ${({spacing:e})=>e[3]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:e})=>e.round};
    width: 32px;
    height: 32px;
  }

  .chain-image {
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:e})=>e.round};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  @media (hover: hover) and (pointer: fine) {
    .pay-option-container:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }
`;var t1=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let t2=class extends tJ.LitElement{constructor(){super(),this.unsubscribe=[],this.options=[],this.selectedPaymentAsset=null}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.resizeObserver?.disconnect();let e=this.shadowRoot?.querySelector(".pay-options-container");e?.removeEventListener("scroll",this.handleOptionsListScroll.bind(this))}firstUpdated(){let e=this.shadowRoot?.querySelector(".pay-options-container");e&&(requestAnimationFrame(this.handleOptionsListScroll.bind(this)),e?.addEventListener("scroll",this.handleOptionsListScroll.bind(this)),this.resizeObserver=new ResizeObserver(()=>{this.handleOptionsListScroll()}),this.resizeObserver?.observe(e),this.handleOptionsListScroll())}render(){return r.html`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.options.map(e=>this.payOptionTemplate(e))}
      </wui-flex>
    `}payOptionTemplate(e){let{network:t,metadata:i,asset:o,amount:n="0"}=e,l=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===t),c=`${t}:${o}`,u=`${this.selectedPaymentAsset?.network}:${this.selectedPaymentAsset?.asset}`,d=f.NumberUtil.bigNumber(n,{safe:!0}),p=d.gt(0);return r.html`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        @click=${()=>this.onSelect?.(e)}
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-image
              src=${(0,a.ifDefined)(i.logoURI)}
              class="token-image"
              size="3xl"
            ></wui-image>
            <wui-image
              src=${(0,a.ifDefined)(et.AssetUtil.getNetworkImage(l))}
              class="chain-image"
              size="md"
            ></wui-image>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="lg-regular" color="primary">${i.symbol}</wui-text>
            ${p?r.html`<wui-text variant="sm-regular" color="secondary">
                  ${d.round(6).toString()} ${i.symbol}
                </wui-text>`:null}
          </wui-flex>
        </wui-flex>

        ${c===u?r.html`<wui-icon name="checkmark" size="md" color="success"></wui-icon>`:null}
      </wui-flex>
    `}handleOptionsListScroll(){let e=this.shadowRoot?.querySelector(".pay-options-container");e&&(e.scrollHeight>300?(e.style.setProperty("--options-mask-image",`linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--options-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--options-scroll--top-opacity))) 1px,
          black 50px,
          black calc(100% - 50px),
          rgba(155, 155, 155, calc(1 - var(--options-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--options-scroll--bottom-opacity))) 100%
        )`),e.style.setProperty("--options-scroll--top-opacity",t0.interpolate([0,50],[0,1],e.scrollTop).toString()),e.style.setProperty("--options-scroll--bottom-opacity",t0.interpolate([0,50],[0,1],e.scrollHeight-e.scrollTop-e.offsetHeight).toString())):(e.style.setProperty("--options-mask-image","none"),e.style.setProperty("--options-scroll--top-opacity","0"),e.style.setProperty("--options-scroll--bottom-opacity","0")))}};t2.styles=[t3],t1([(0,i.property)({type:Array})],t2.prototype,"options",void 0),t1([(0,i.property)()],t2.prototype,"selectedPaymentAsset",void 0),t1([(0,i.property)()],t2.prototype,"onSelect",void 0),t2=t1([(0,z.customElement)("w3m-pay-options")],t2);let t5=B.css`
  .payment-methods-container {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:e})=>e[5]};
    border-top-left-radius: ${({borderRadius:e})=>e[5]};
  }

  .pay-options-container {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding: ${({spacing:e})=>e[1]};
  }

  w3m-tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: fit-content;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }

  w3m-pay-options.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
`;var t4=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let t6={eip155:{icon:"ethereum",label:"EVM"},solana:{icon:"solana",label:"Solana"},bip122:{icon:"bitcoin",label:"Bitcoin"},ton:{icon:"ton",label:"Ton"}},t8=class extends tU.LitElement{constructor(){super(),this.unsubscribe=[],this.profileName=null,this.paymentAsset=tg.state.paymentAsset,this.namespace=void 0,this.caipAddress=void 0,this.amount=tg.state.amount,this.recipient=tg.state.recipient,this.activeConnectorIds=l.ConnectorController.state.activeConnectorIds,this.selectedPaymentAsset=tg.state.selectedPaymentAsset,this.selectedExchange=tg.state.selectedExchange,this.isFetchingQuote=tg.state.isFetchingQuote,this.quoteError=tg.state.quoteError,this.quote=tg.state.quote,this.isFetchingTokenBalances=tg.state.isFetchingTokenBalances,this.tokenBalances=tg.state.tokenBalances,this.isPaymentInProgress=tg.state.isPaymentInProgress,this.exchangeUrlForQuote=tg.state.exchangeUrlForQuote,this.completedTransactionsCount=0,this.unsubscribe.push(tg.subscribeKey("paymentAsset",e=>this.paymentAsset=e)),this.unsubscribe.push(tg.subscribeKey("tokenBalances",e=>this.onTokenBalancesChanged(e))),this.unsubscribe.push(tg.subscribeKey("isFetchingTokenBalances",e=>this.isFetchingTokenBalances=e)),this.unsubscribe.push(l.ConnectorController.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(tg.subscribeKey("selectedPaymentAsset",e=>this.selectedPaymentAsset=e)),this.unsubscribe.push(tg.subscribeKey("isFetchingQuote",e=>this.isFetchingQuote=e)),this.unsubscribe.push(tg.subscribeKey("quoteError",e=>this.quoteError=e)),this.unsubscribe.push(tg.subscribeKey("quote",e=>this.quote=e)),this.unsubscribe.push(tg.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(tg.subscribeKey("recipient",e=>this.recipient=e)),this.unsubscribe.push(tg.subscribeKey("isPaymentInProgress",e=>this.isPaymentInProgress=e)),this.unsubscribe.push(tg.subscribeKey("selectedExchange",e=>this.selectedExchange=e)),this.unsubscribe.push(tg.subscribeKey("exchangeUrlForQuote",e=>this.exchangeUrlForQuote=e)),this.resetQuoteState(),this.initializeNamespace(),this.fetchTokens()}disconnectedCallback(){super.disconnectedCallback(),this.resetAssetsState(),this.unsubscribe.forEach(e=>e())}updated(e){super.updated(e),e.has("selectedPaymentAsset")&&this.fetchQuote()}render(){return r.html`
      <wui-flex flexDirection="column">
        ${this.profileTemplate()}

        <wui-flex
          flexDirection="column"
          gap="4"
          class="payment-methods-container"
          .padding=${["4","4","5","4"]}
        >
          ${this.paymentOptionsViewTemplate()} ${this.amountWithFeeTemplate()}

          <wui-flex
            alignItems="center"
            justifyContent="space-between"
            .padding=${["1","0","1","0"]}
          >
            <wui-separator></wui-separator>
          </wui-flex>

          ${this.paymentActionsTemplate()}
        </wui-flex>
      </wui-flex>
    `}profileTemplate(){if(this.selectedExchange){let e=f.NumberUtil.formatNumber(this.quote?.origin.amount,{decimals:this.quote?.origin.currency.metadata.decimals??0}).toString();return r.html`
        <wui-flex
          .padding=${["4","3","4","3"]}
          alignItems="center"
          justifyContent="space-between"
          gap="2"
        >
          <wui-text variant="lg-regular" color="secondary">Paying with</wui-text>

          ${this.quote?r.html`<wui-text variant="lg-regular" color="primary">
                ${f.NumberUtil.bigNumber(e,{safe:!0}).round(6).toString()}
                ${this.quote.origin.currency.metadata.symbol}
              </wui-text>`:r.html`<wui-shimmer width="80px" height="18px" variant="light"></wui-shimmer>`}
        </wui-flex>
      `}let e=S.CoreHelperUtil.getPlainAddress(this.caipAddress)??"",{name:t,image:i}=this.getWalletProperties({namespace:this.namespace}),{icon:o,label:n}=t6[this.namespace]??{};return r.html`
      <wui-flex
        .padding=${["4","3","4","3"]}
        alignItems="center"
        justifyContent="space-between"
        gap="2"
      >
        <wui-wallet-switch
          profileName=${(0,a.ifDefined)(this.profileName)}
          address=${(0,a.ifDefined)(e)}
          imageSrc=${(0,a.ifDefined)(i)}
          alt=${(0,a.ifDefined)(t)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        <wui-wallet-switch
          profileName=${(0,a.ifDefined)(n)}
          address=${(0,a.ifDefined)(e)}
          icon=${(0,a.ifDefined)(o)}
          iconSize="xs"
          .enableGreenCircle=${!1}
          alt=${(0,a.ifDefined)(n)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
      </wui-flex>
    `}initializeNamespace(){let e=s.ChainController.state.activeChain;this.namespace=e,this.caipAddress=s.ChainController.getAccountData(e)?.caipAddress,this.profileName=s.ChainController.getAccountData(e)?.profileName??null,this.unsubscribe.push(s.ChainController.subscribeChainProp("accountState",e=>this.onAccountStateChanged(e),e))}async fetchTokens(){if(this.namespace){let e;if(this.caipAddress){let{chainId:t,chainNamespace:r}=eN.ParseUtil.parseCaipAddress(this.caipAddress),i=`${r}:${t}`;e=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===i)}await tg.fetchTokens({caipAddress:this.caipAddress,caipNetwork:e,namespace:this.namespace})}}fetchQuote(){if(this.amount&&this.recipient&&this.selectedPaymentAsset&&this.paymentAsset){let{address:e}=this.caipAddress?eN.ParseUtil.parseCaipAddress(this.caipAddress):{};tg.fetchQuote({amount:this.amount.toString(),address:e,sourceToken:this.selectedPaymentAsset,toToken:this.paymentAsset,recipient:this.recipient})}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};let t=this.activeConnectorIds[e];if(!t)return{name:void 0,image:void 0};let r=l.ConnectorController.getConnector({id:t,namespace:e});if(!r)return{name:void 0,image:void 0};let i=et.AssetUtil.getConnectorImage(r);return{name:r.name,image:i}}paymentOptionsViewTemplate(){return r.html`
      <wui-flex flexDirection="column" gap="2">
        <wui-text variant="sm-regular" color="secondary">CHOOSE PAYMENT OPTION</wui-text>
        <wui-flex class="pay-options-container">${this.paymentOptionsTemplate()}</wui-flex>
      </wui-flex>
    `}paymentOptionsTemplate(){let e=this.getPaymentAssetFromTokenBalances();if(this.isFetchingTokenBalances)return r.html`<w3m-pay-options-skeleton></w3m-pay-options-skeleton>`;if(0===e.length)return r.html`<w3m-pay-options-empty
        @connectOtherWallet=${this.onConnectOtherWallet.bind(this)}
      ></w3m-pay-options-empty>`;let t={disabled:this.isFetchingQuote};return r.html`<w3m-pay-options
      class=${(0,tx.classMap)(t)}
      .options=${e}
      .selectedPaymentAsset=${(0,a.ifDefined)(this.selectedPaymentAsset)}
      .onSelect=${this.onSelectedPaymentAssetChanged.bind(this)}
    ></w3m-pay-options>`}amountWithFeeTemplate(){return this.isFetchingQuote||!this.selectedPaymentAsset||this.quoteError?r.html`<w3m-pay-fees-skeleton></w3m-pay-fees-skeleton>`:r.html`<w3m-pay-fees></w3m-pay-fees>`}paymentActionsTemplate(){let e=this.isFetchingQuote||this.isFetchingTokenBalances,t=this.isFetchingQuote||this.isFetchingTokenBalances||!this.selectedPaymentAsset||!!this.quoteError,i=f.NumberUtil.formatNumber(this.quote?.origin.amount??0,{decimals:this.quote?.origin.currency.metadata.decimals??0}).toString();return this.selectedExchange?e||t?r.html`
          <wui-shimmer width="100%" height="48px" variant="light" ?rounded=${!0}></wui-shimmer>
        `:r.html`<wui-button
        size="lg"
        fullWidth
        variant="accent-secondary"
        @click=${this.onPayWithExchange.bind(this)}
      >
        ${`Continue in ${this.selectedExchange.name}`}

        <wui-icon name="arrowRight" color="inherit" size="sm" slot="iconRight"></wui-icon>
      </wui-button>`:r.html`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="md-regular" color="secondary">Order Total</wui-text>

          ${e||t?r.html`<wui-shimmer width="58px" height="32px" variant="light"></wui-shimmer>`:r.html`<wui-flex alignItems="center" gap="01">
                <wui-text variant="h4-regular" color="primary">${tu(i)}</wui-text>

                <wui-text variant="lg-regular" color="secondary">
                  ${this.quote?.origin.currency.metadata.symbol||"Unknown"}
                </wui-text>
              </wui-flex>`}
        </wui-flex>

        ${this.actionButtonTemplate({isLoading:e,isDisabled:t})}
      </wui-flex>
    `}actionButtonTemplate(e){let t=e5(this.quote),{isLoading:i,isDisabled:o}=e,a="Pay";return t.length>1&&0===this.completedTransactionsCount&&(a="Approve"),r.html`
      <wui-button
        size="lg"
        variant="accent-primary"
        ?loading=${i||this.isPaymentInProgress}
        ?disabled=${o||this.isPaymentInProgress}
        @click=${()=>{t.length>0?this.onSendTransactions():this.onTransfer()}}
      >
        ${a}
        ${i?null:r.html`<wui-icon
              name="arrowRight"
              color="inherit"
              size="sm"
              slot="iconRight"
            ></wui-icon>`}
      </wui-button>
    `}getPaymentAssetFromTokenBalances(){return this.namespace?(this.tokenBalances[this.namespace]??[]).map(e=>{try{return function(e){let t=s.ChainController.getAllRequestedCaipNetworks().find(t=>t.caipNetworkId===e.chainId),r=e.address;if(!t)throw Error(`Target network not found for balance chainId "${e.chainId}"`);if(eR.HelpersUtil.isLowerCaseMatch(e.symbol,t.nativeCurrency.symbol))r="native";else if(S.CoreHelperUtil.isCaipAddress(r)){let{address:e}=eN.ParseUtil.parseCaipAddress(r);r=e}else if(!r)throw Error(`Balance address not found for balance symbol "${e.symbol}"`);return{network:t.caipNetworkId,asset:r,metadata:{name:e.name,symbol:e.symbol,decimals:Number(e.quantity.decimals),logoURI:e.iconUrl},amount:e.quantity.numeric}}(e)}catch(e){return null}}).filter(e=>!!e).filter(e=>{let{chainId:t}=eN.ParseUtil.parseCaipNetworkId(e.network),{chainId:r}=eN.ParseUtil.parseCaipNetworkId(this.paymentAsset.network);return!!eR.HelpersUtil.isLowerCaseMatch(e.asset,this.paymentAsset.asset)||!this.selectedExchange||!eR.HelpersUtil.isLowerCaseMatch(t.toString(),r.toString())}):[]}onTokenBalancesChanged(e){this.tokenBalances=e;let[t]=this.getPaymentAssetFromTokenBalances();t&&tg.setSelectedPaymentAsset(t)}async onConnectOtherWallet(){await l.ConnectorController.connect(),await c.ModalController.open({view:"PayQuote"})}onAccountStateChanged(e){let{address:t}=this.caipAddress?eN.ParseUtil.parseCaipAddress(this.caipAddress):{};if(this.caipAddress=e?.caipAddress,this.profileName=e?.profileName??null,t){let{address:e}=this.caipAddress?eN.ParseUtil.parseCaipAddress(this.caipAddress):{};e?eR.HelpersUtil.isLowerCaseMatch(e,t)||(this.resetAssetsState(),this.resetQuoteState(),this.fetchTokens()):c.ModalController.close()}}onSelectedPaymentAssetChanged(e){this.isFetchingQuote||tg.setSelectedPaymentAsset(e)}async onTransfer(){let e=e2(this.quote);if(e){if(!eR.HelpersUtil.isLowerCaseMatch(this.selectedPaymentAsset?.asset,e.deposit.currency))throw Error("Quote asset is not the same as the selected payment asset");let t=this.selectedPaymentAsset?.amount??"0",r=f.NumberUtil.formatNumber(e.deposit.amount,{decimals:this.selectedPaymentAsset?.metadata.decimals??0}).toString();if(!f.NumberUtil.bigNumber(t).gte(r))return void w.SnackController.showError("Insufficient funds");if(this.quote&&this.selectedPaymentAsset&&this.caipAddress&&this.namespace){let{address:t}=eN.ParseUtil.parseCaipAddress(this.caipAddress);await tg.onTransfer({chainNamespace:this.namespace,fromAddress:t,toAddress:e.deposit.receiver,amount:r,paymentAsset:this.selectedPaymentAsset}),tg.setRequestId(e.requestId),d.RouterController.push("PayLoading")}}}async onSendTransactions(){let e=this.selectedPaymentAsset?.amount??"0",t=f.NumberUtil.formatNumber(this.quote?.origin.amount??0,{decimals:this.selectedPaymentAsset?.metadata.decimals??0}).toString();if(!f.NumberUtil.bigNumber(e).gte(t))return void w.SnackController.showError("Insufficient funds");let r=e5(this.quote),[i]=e5(this.quote,this.completedTransactionsCount);i&&this.namespace&&(await tg.onSendTransaction({namespace:this.namespace,transactionStep:i}),this.completedTransactionsCount+=1,this.completedTransactionsCount===r.length&&(tg.setRequestId(i.requestId),d.RouterController.push("PayLoading")))}onPayWithExchange(){if(this.exchangeUrlForQuote){let e=S.CoreHelperUtil.returnOpenHref("","popupWindow","scrollbar=yes,width=480,height=720");if(!e)throw Error("Could not create popup window");e.location.href=this.exchangeUrlForQuote;let t=e2(this.quote);t&&tg.setRequestId(t.requestId),tg.initiatePayment(),d.RouterController.push("PayLoading")}}resetAssetsState(){tg.setSelectedPaymentAsset(null)}resetQuoteState(){tg.resetQuoteState()}};t8.styles=t5,t4([(0,o.state)()],t8.prototype,"profileName",void 0),t4([(0,o.state)()],t8.prototype,"paymentAsset",void 0),t4([(0,o.state)()],t8.prototype,"namespace",void 0),t4([(0,o.state)()],t8.prototype,"caipAddress",void 0),t4([(0,o.state)()],t8.prototype,"amount",void 0),t4([(0,o.state)()],t8.prototype,"recipient",void 0),t4([(0,o.state)()],t8.prototype,"activeConnectorIds",void 0),t4([(0,o.state)()],t8.prototype,"selectedPaymentAsset",void 0),t4([(0,o.state)()],t8.prototype,"selectedExchange",void 0),t4([(0,o.state)()],t8.prototype,"isFetchingQuote",void 0),t4([(0,o.state)()],t8.prototype,"quoteError",void 0),t4([(0,o.state)()],t8.prototype,"quote",void 0),t4([(0,o.state)()],t8.prototype,"isFetchingTokenBalances",void 0),t4([(0,o.state)()],t8.prototype,"tokenBalances",void 0),t4([(0,o.state)()],t8.prototype,"isPaymentInProgress",void 0),t4([(0,o.state)()],t8.prototype,"exchangeUrlForQuote",void 0),t4([(0,o.state)()],t8.prototype,"completedTransactionsCount",void 0),t8=t4([(0,z.customElement)("w3m-pay-quote-view")],t8);let t7=B.css`
  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }

  .transfers-badge {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }
`;var t9=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let re=class extends em.LitElement{constructor(){super(),this.unsubscribe=[],this.paymentAsset=tg.state.paymentAsset,this.amount=tg.state.amount,this.unsubscribe.push(tg.subscribeKey("paymentAsset",e=>{this.paymentAsset=e}),tg.subscribeKey("amount",e=>{this.amount=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=s.ChainController.getAllRequestedCaipNetworks().find(e=>e.caipNetworkId===this.paymentAsset.network);return r.html`<wui-flex
      alignItems="center"
      gap="1"
      .padding=${["1","2","1","1"]}
      class="transfers-badge"
    >
      <wui-image src=${(0,a.ifDefined)(this.paymentAsset.metadata.logoURI)} size="xl"></wui-image>
      <wui-text variant="lg-regular" color="primary">
        ${this.amount} ${this.paymentAsset.metadata.symbol}
      </wui-text>
      <wui-text variant="sm-regular" color="secondary">
        on ${e?.name??"Unknown"}
      </wui-text>
    </wui-flex>`}};re.styles=[t7],t9([(0,i.property)()],re.prototype,"paymentAsset",void 0),t9([(0,i.property)()],re.prototype,"amount",void 0),re=t9([(0,z.customElement)("w3m-pay-header")],re);let rt=B.css`
  :host {
    height: 60px;
  }

  :host > wui-flex {
    box-sizing: border-box;
    background-color: var(--local-header-background-color);
  }

  wui-text {
    background-color: var(--local-header-background-color);
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-down-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-up-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-icon-button[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;var rr=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let ri=["SmartSessionList"],ro={PayWithExchange:B.vars.tokens.theme.foregroundPrimary};function ra(){let e=d.RouterController.state.data?.connector?.name,t=d.RouterController.state.data?.wallet?.name,r=d.RouterController.state.data?.network?.name,i=t??e,o=l.ConnectorController.getConnectors(),a=1===o.length&&o[0]?.id==="w3m-email",n=s.ChainController.getAccountData()?.socialProvider;return{Connect:`Connect ${a?"Email":""} Wallet`,Create:"Create Wallet",ChooseAccountName:void 0,Account:void 0,AccountSettings:void 0,AllWallets:"All Wallets",ApproveTransaction:"Approve Transaction",BuyInProgress:"Buy",UsageExceeded:"Usage Exceeded",ConnectingExternal:i??"Connect Wallet",ConnectingWalletConnect:i??"WalletConnect",ConnectingWalletConnectBasic:"WalletConnect",ConnectingSiwe:"Sign In",Convert:"Convert",ConvertSelectToken:"Select token",ConvertPreview:"Preview Convert",Downloads:i?`Get ${i}`:"Downloads",EmailLogin:"Email Login",EmailVerifyOtp:"Confirm Email",EmailVerifyDevice:"Register Device",GetWallet:"Get a Wallet",Networks:"Choose Network",OnRampProviders:"Choose Provider",OnRampActivity:"Activity",OnRampTokenSelect:"Select Token",OnRampFiatSelect:"Select Currency",Pay:"How you pay",ProfileWallets:"Wallets",SwitchNetwork:r??"Switch Network",Transactions:"Activity",UnsupportedChain:"Switch Network",UpgradeEmailWallet:"Upgrade Your Wallet",UpdateEmailWallet:"Edit Email",UpdateEmailPrimaryOtp:"Confirm Current Email",UpdateEmailSecondaryOtp:"Confirm New Email",WhatIsABuy:"What is Buy?",RegisterAccountName:"Choose Name",RegisterAccountNameSuccess:"",WalletReceive:"Receive",WalletCompatibleNetworks:"Compatible Networks",Swap:"Swap",SwapSelectToken:"Select Token",SwapPreview:"Preview Swap",WalletSend:"Send",WalletSendPreview:"Review Send",WalletSendSelectToken:"Select Token",WalletSendConfirmed:"Confirmed",WhatIsANetwork:"What is a network?",WhatIsAWallet:"What is a Wallet?",ConnectWallets:"Connect Wallet",ConnectSocials:"All Socials",ConnectingSocial:n?n.charAt(0).toUpperCase()+n.slice(1):"Connect Social",ConnectingMultiChain:"Select Chain",ConnectingFarcaster:"Farcaster",SwitchActiveChain:"Switch Chain",SmartSessionCreated:void 0,SmartSessionList:"Smart Sessions",SIWXSignMessage:"Sign In",PayLoading:"Processing payment...",PayQuote:"Payment Quote",DataCapture:"Profile",DataCaptureOtpConfirm:"Confirm Email",FundWallet:"Fund Wallet",PayWithExchange:"Deposit from Exchange",PayWithExchangeSelectAsset:"Select Asset",SmartAccountSettings:"Smart Account Settings"}}let rn=class extends J.LitElement{constructor(){super(),this.unsubscribe=[],this.heading=ra()[d.RouterController.state.view],this.network=s.ChainController.state.activeCaipNetwork,this.networkImage=et.AssetUtil.getNetworkImage(this.network),this.showBack=!1,this.prevHistoryLength=1,this.view=d.RouterController.state.view,this.viewDirection="",this.unsubscribe.push(ee.AssetController.subscribeNetworkImages(()=>{this.networkImage=et.AssetUtil.getNetworkImage(this.network)}),d.RouterController.subscribeKey("view",e=>{setTimeout(()=>{this.view=e,this.heading=ra()[e]},eh.ANIMATION_DURATIONS.HeaderText),this.onViewChange(),this.onHistoryChange()}),s.ChainController.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.networkImage=et.AssetUtil.getNetworkImage(this.network)}))}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=ro[d.RouterController.state.view]??B.vars.tokens.theme.backgroundPrimary;return this.style.setProperty("--local-header-background-color",e),r.html`
      <wui-flex
        .padding=${["0","4","0","4"]}
        justifyContent="space-between"
        alignItems="center"
      >
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `}onWalletHelp(){I.EventsController.sendEvent({type:"track",event:"CLICK_WALLET_HELP"}),d.RouterController.push("WhatIsAWallet")}async onClose(){await h.safeClose()}rightHeaderTemplate(){let e=m.OptionsController?.state?.features?.smartSessions;return"Account"===d.RouterController.state.view&&e?r.html`<wui-flex>
      <wui-icon-button
        icon="clock"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${()=>d.RouterController.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-button>
      ${this.closeButtonTemplate()}
    </wui-flex> `:this.closeButtonTemplate()}closeButtonTemplate(){return r.html`
      <wui-icon-button
        icon="close"
        size="lg"
        type="neutral"
        variant="primary"
        iconSize="lg"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-button>
    `}titleTemplate(){if("PayQuote"===this.view)return r.html`<w3m-pay-header></w3m-pay-header>`;let e=ri.includes(this.view);return r.html`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="2"
      >
        <wui-text
          display="inline"
          variant="lg-regular"
          color="primary"
          data-testid="w3m-header-text"
        >
          ${this.heading}
        </wui-text>
        ${e?r.html`<wui-tag variant="accent" size="md">Beta</wui-tag>`:null}
      </wui-flex>
    `}leftHeaderTemplate(){let{view:e}=d.RouterController.state,t="Connect"===e,i=m.OptionsController.state.enableEmbedded,o=m.OptionsController.state.enableNetworkSwitch;return"Account"===e&&o?r.html`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${(0,a.ifDefined)(this.network?.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${(0,a.ifDefined)(this.networkImage)}
      ></wui-select>`:this.showBack&&!("ApproveTransaction"===e||"ConnectingSiwe"===e||t&&i)?r.html`<wui-icon-button
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-button>`:r.html`<wui-icon-button
      data-hidden=${!t}
      id="dynamic"
      icon="helpCircle"
      size="lg"
      iconSize="lg"
      type="neutral"
      variant="primary"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-button>`}onNetworks(){this.isAllowedNetworkSwitch()&&(I.EventsController.sendEvent({type:"track",event:"CLICK_NETWORKS"}),d.RouterController.push("Networks"))}isAllowedNetworkSwitch(){let e=s.ChainController.getAllRequestedCaipNetworks(),t=!!e&&e.length>1,r=e?.find(({id:e})=>e===this.network?.id);return t||!r}onViewChange(){let{history:e}=d.RouterController.state,t=eh.VIEW_DIRECTION.Next;e.length<this.prevHistoryLength&&(t=eh.VIEW_DIRECTION.Prev),this.prevHistoryLength=e.length,this.viewDirection=t}async onHistoryChange(){let{history:e}=d.RouterController.state,t=this.shadowRoot?.querySelector("#dynamic");e.length>1&&!this.showBack&&t?(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!0,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"})):e.length<=1&&this.showBack&&t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}onGoBack(){d.RouterController.goBack()}};rn.styles=rt,rr([(0,o.state)()],rn.prototype,"heading",void 0),rr([(0,o.state)()],rn.prototype,"network",void 0),rr([(0,o.state)()],rn.prototype,"networkImage",void 0),rr([(0,o.state)()],rn.prototype,"showBack",void 0),rr([(0,o.state)()],rn.prototype,"prevHistoryLength",void 0),rr([(0,o.state)()],rn.prototype,"view",void 0),rr([(0,o.state)()],rn.prototype,"viewDirection",void 0),rn=rr([(0,z.customElement)("w3m-header")],rn);var rs=t,rl=t;e.i(83227),e.i(12190);let rc=B.css`
  :host {
    display: flex;
    align-items: center;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[2]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow:
      0px 0px 8px 0px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px ${({tokens:e})=>e.theme.borderPrimary};
    max-width: 320px;
  }

  wui-icon-box {
    border-radius: ${({borderRadius:e})=>e.round} !important;
    overflow: hidden;
  }

  wui-loading-spinner {
    padding: ${({spacing:e})=>e[1]};
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    border-radius: ${({borderRadius:e})=>e.round} !important;
  }
`;var ru=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rd=class extends rl.LitElement{constructor(){super(...arguments),this.message="",this.variant="success"}render(){return r.html`
      ${this.templateIcon()}
      <wui-text variant="lg-regular" color="primary" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `}templateIcon(){return"loading"===this.variant?r.html`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:r.html`<wui-icon-box
      size="md"
      color=${({success:"success",error:"error",warning:"warning",info:"default"})[this.variant]}
      icon=${({success:"checkmark",error:"warning",warning:"warningCircle",info:"info"})[this.variant]}
    ></wui-icon-box>`}};rd.styles=[L.resetStyles,rc],ru([(0,i.property)()],rd.prototype,"message",void 0),ru([(0,i.property)()],rd.prototype,"variant",void 0),rd=ru([(0,z.customElement)("wui-snackbar")],rd);let rp=tB.css`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`;var rh=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rm=class extends rs.LitElement{constructor(){super(),this.unsubscribe=[],this.timeout=void 0,this.open=w.SnackController.state.open,this.unsubscribe.push(w.SnackController.subscribeKey("open",e=>{this.open=e,this.onOpen()}))}disconnectedCallback(){clearTimeout(this.timeout),this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=w.SnackController.state;return r.html` <wui-snackbar message=${e} variant=${t}></wui-snackbar> `}onOpen(){clearTimeout(this.timeout),this.open?(this.animate([{opacity:0,transform:"translateX(-50%) scale(0.85)"},{opacity:1,transform:"translateX(-50%) scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.timeout&&clearTimeout(this.timeout),w.SnackController.state.autoClose&&(this.timeout=setTimeout(()=>w.SnackController.hide(),2500))):this.animate([{opacity:1,transform:"translateX(-50%) scale(1)"},{opacity:0,transform:"translateX(-50%) scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"})}};rm.styles=rp,rh([(0,o.state)()],rm.prototype,"open",void 0),rm=rh([(0,z.customElement)("w3m-snackbar")],rm);var rw=t;let rg=(0,g.proxy)({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),ry=(0,P.withErrorBoundary)({state:rg,subscribe:e=>(0,g.subscribe)(rg,()=>e(rg)),subscribeKey:(e,t)=>(0,y.subscribeKey)(rg,e,t),showTooltip({message:e,triggerRect:t,variant:r}){rg.open=!0,rg.message=e,rg.triggerRect=t,rg.variant=r},hide(){rg.open=!1,rg.message="",rg.triggerRect={width:0,height:0,top:0,left:0}}}),rf=tB.css`
  :host {
    width: 100%;
    display: block;
  }
`;var rb=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rv=class extends rw.LitElement{constructor(){super(),this.unsubscribe=[],this.text="",this.open=ry.state.open,this.unsubscribe.push(d.RouterController.subscribeKey("view",()=>{ry.hide()}),c.ModalController.subscribeKey("open",e=>{e||ry.hide()}),ry.subscribeKey("open",e=>{this.open=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),ry.hide()}render(){return r.html`
      <div
        @pointermove=${this.onMouseEnter.bind(this)}
        @pointerleave=${this.onMouseLeave.bind(this)}
      >
        ${this.renderChildren()}
      </div>
    `}renderChildren(){return r.html`<slot></slot> `}onMouseEnter(){let e=this.getBoundingClientRect();if(!this.open){let t=document.querySelector("w3m-modal"),r={width:e.width,height:e.height,left:e.left,top:e.top};if(t){let i=t.getBoundingClientRect();r.left=e.left-(window.innerWidth-i.width)/2,r.top=e.top-(window.innerHeight-i.height)/2}ry.showTooltip({message:this.text,triggerRect:r,variant:"shade"})}}onMouseLeave(e){this.contains(e.relatedTarget)||ry.hide()}};rv.styles=[rf],rb([(0,i.property)()],rv.prototype,"text",void 0),rb([(0,o.state)()],rv.prototype,"open",void 0),rv=rb([(0,z.customElement)("w3m-tooltip-trigger")],rv);var rx=t;let rk=B.css`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({spacing:e})=>e["3"]} 10px ${({spacing:e})=>e["3"]};
    border-radius: ${({borderRadius:e})=>e["3"]};
    color: ${({tokens:e})=>e.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({spacing:e})=>e["5"]});
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var rC=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rS=class extends rx.LitElement{constructor(){super(),this.unsubscribe=[],this.open=ry.state.open,this.message=ry.state.message,this.triggerRect=ry.state.triggerRect,this.variant=ry.state.variant,this.unsubscribe.push(ry.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;let e=this.triggerRect.top,t=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${t}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?"flex":"none"};
    --w3m-tooltip-opacity: ${+!!this.open};
    `,r.html`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`}};rS.styles=[rk],rC([(0,o.state)()],rS.prototype,"open",void 0),rC([(0,o.state)()],rS.prototype,"message",void 0),rC([(0,o.state)()],rS.prototype,"triggerRect",void 0),rC([(0,o.state)()],rS.prototype,"variant",void 0),rS=rC([(0,z.customElement)("w3m-tooltip")],rS);let rT={getTabsByNamespace:e=>e&&e===b.ConstantsUtil.CHAIN.EVM?m.OptionsController.state.remoteFeatures?.activity===!1?eh.ACCOUNT_TABS.filter(e=>"Activity"!==e.label):eh.ACCOUNT_TABS:[],isValidReownName:e=>/^[a-zA-Z0-9]+$/gu.test(e),isValidEmail:e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/gu.test(e),validateReownName:e=>e.replace(/\^/gu,"").toLowerCase().replace(/[^a-zA-Z0-9]/gu,""),hasFooter(){let e=d.RouterController.state.view;if(eh.VIEWS_WITH_LEGAL_FOOTER.includes(e)){let{termsConditionsUrl:e,privacyPolicyUrl:t}=m.OptionsController.state,r=m.OptionsController.state.features?.legalCheckbox;return(!!e||!!t)&&!r}return eh.VIEWS_WITH_DEFAULT_FOOTER.includes(e)}};var rA=t,rP=t;e.i(3596);let r$=B.css`
  :host wui-ux-by-reown {
    padding-top: 0;
  }

  :host wui-ux-by-reown.branding-only {
    padding-top: ${({spacing:e})=>e["3"]};
  }

  a {
    text-decoration: none;
    color: ${({tokens:e})=>e.core.textAccentPrimary};
    font-weight: 500;
  }
`;var rE=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rI=class extends rP.LitElement{constructor(){super(),this.unsubscribe=[],this.remoteFeatures=m.OptionsController.state.remoteFeatures,this.unsubscribe.push(m.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=m.OptionsController.state,i=m.OptionsController.state.features?.legalCheckbox;return(e||t)&&!i?r.html`
      <wui-flex flexDirection="column">
        <wui-flex .padding=${["4","3","3","3"]} justifyContent="center">
          <wui-text color="secondary" variant="md-regular" align="center">
            By connecting your wallet, you agree to our <br />
            ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
          </wui-text>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `:r.html`
        <wui-flex flexDirection="column"> ${this.reownBrandingTemplate(!0)} </wui-flex>
      `}andTemplate(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=m.OptionsController.state;return e&&t?"and":""}termsTemplate(){let{termsConditionsUrl:e}=m.OptionsController.state;return e?r.html`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Terms of Service</a
    >`:null}privacyTemplate(){let{privacyPolicyUrl:e}=m.OptionsController.state;return e?r.html`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Privacy Policy</a
    >`:null}reownBrandingTemplate(e=!1){return this.remoteFeatures?.reownBranding?e?r.html`<wui-ux-by-reown class="branding-only"></wui-ux-by-reown>`:r.html`<wui-ux-by-reown></wui-ux-by-reown>`:null}};rI.styles=[r$],rE([(0,o.state)()],rI.prototype,"remoteFeatures",void 0),rI=rE([(0,z.customElement)("w3m-legal-footer")],rI);var rN=t;e.i(10380);let rR=tB.css``,rU=class extends rN.LitElement{render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=m.OptionsController.state;return e||t?r.html`
      <wui-flex
        .padding=${["4","3","3","3"]}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <wui-text color="secondary" variant="md-regular" align="center">
          We work with the best providers to give you the lowest fees and best support. More options
          coming soon!
        </wui-text>

        ${this.howDoesItWorkTemplate()}
      </wui-flex>
    `:null}howDoesItWorkTemplate(){return r.html` <wui-link @click=${this.onWhatIsBuy.bind(this)}>
      <wui-icon size="xs" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
      How does it work?
    </wui-link>`}onWhatIsBuy(){I.EventsController.sendEvent({type:"track",event:"SELECT_WHAT_IS_A_BUY",properties:{isSmartAccount:(0,k.getPreferredAccountType)(s.ChainController.state.activeChain)===v.W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT}}),d.RouterController.push("WhatIsABuy")}};rU.styles=[rR],rU=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n}([(0,z.customElement)("w3m-onramp-providers-footer")],rU);let rO=B.css`
  :host {
    display: block;
  }

  div.container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: auto;
    display: block;
  }

  div.container[status='hide'] {
    animation: fade-out;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: 0s;
  }

  div.container[status='show'] {
    animation: fade-in;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      filter: blur(0px);
    }
    to {
      opacity: 0;
      filter: blur(6px);
    }
  }
`;var rD=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rW=class extends rA.LitElement{constructor(){super(...arguments),this.resizeObserver=void 0,this.unsubscribe=[],this.status="hide",this.view=d.RouterController.state.view}firstUpdated(){this.status=rT.hasFooter()?"show":"hide",this.unsubscribe.push(d.RouterController.subscribeKey("view",e=>{this.view=e,this.status=rT.hasFooter()?"show":"hide","hide"===this.status&&document.documentElement.style.setProperty("--apkt-footer-height","0px")})),this.resizeObserver=new ResizeObserver(e=>{for(let t of e)if(t.target===this.getWrapper()){let e=`${t.contentRect.height}px`;document.documentElement.style.setProperty("--apkt-footer-height",e)}}),this.resizeObserver.observe(this.getWrapper())}render(){return r.html`
      <div class="container" status=${this.status}>${this.templatePageContainer()}</div>
    `}templatePageContainer(){return rT.hasFooter()?r.html` ${this.templateFooter()}`:null}templateFooter(){switch(this.view){case"Networks":return this.templateNetworksFooter();case"Connect":case"ConnectWallets":case"OnRampFiatSelect":case"OnRampTokenSelect":return r.html`<w3m-legal-footer></w3m-legal-footer>`;case"OnRampProviders":return r.html`<w3m-onramp-providers-footer></w3m-onramp-providers-footer>`;default:return null}}templateNetworksFooter(){return r.html` <wui-flex
      class="footer-in"
      padding="3"
      flexDirection="column"
      gap="3"
      alignItems="center"
    >
      <wui-text variant="md-regular" color="secondary" align="center">
        Your connected wallet may not support some of the networks available for this dApp
      </wui-text>
      <wui-link @click=${this.onNetworkHelp.bind(this)}>
        <wui-icon size="sm" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
        What is a network
      </wui-link>
    </wui-flex>`}onNetworkHelp(){I.EventsController.sendEvent({type:"track",event:"CLICK_NETWORK_HELP"}),d.RouterController.push("WhatIsANetwork")}getWrapper(){return this.shadowRoot?.querySelector("div.container")}};rW.styles=[rO],rD([(0,o.state)()],rW.prototype,"status",void 0),rD([(0,o.state)()],rW.prototype,"view",void 0),rW=rD([(0,z.customElement)("w3m-footer")],rW);var rz=t;let rL=B.css`
  :host {
    display: block;
    width: inherit;
  }
`;var rB=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let rj=class extends rz.LitElement{constructor(){super(),this.unsubscribe=[],this.viewState=d.RouterController.state.view,this.history=d.RouterController.state.history.join(","),this.unsubscribe.push(d.RouterController.subscribeKey("view",()=>{this.history=d.RouterController.state.history.join(","),document.documentElement.style.setProperty("--apkt-duration-dynamic","var(--apkt-durations-lg)")}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),document.documentElement.style.setProperty("--apkt-duration-dynamic","0s")}render(){return r.html`${this.templatePageContainer()}`}templatePageContainer(){return r.html`<w3m-router-container
      history=${this.history}
      .setView=${()=>{this.viewState=d.RouterController.state.view}}
    >
      ${this.viewTemplate(this.viewState)}
    </w3m-router-container>`}viewTemplate(e){switch(e){case"AccountSettings":return r.html`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return r.html`<w3m-account-view></w3m-account-view>`;case"AllWallets":return r.html`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return r.html`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return r.html`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return r.html`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":default:return r.html`<w3m-connect-view></w3m-connect-view>`;case"Create":return r.html`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return r.html`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return r.html`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return r.html`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return r.html`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return r.html`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return r.html`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return r.html`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"DataCapture":return r.html`<w3m-data-capture-view></w3m-data-capture-view>`;case"DataCaptureOtpConfirm":return r.html`<w3m-data-capture-otp-confirm-view></w3m-data-capture-otp-confirm-view>`;case"Downloads":return r.html`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return r.html`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return r.html`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return r.html`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return r.html`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return r.html`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return r.html`<w3m-network-switch-view></w3m-network-switch-view>`;case"ProfileWallets":return r.html`<w3m-profile-wallets-view></w3m-profile-wallets-view>`;case"Transactions":return r.html`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return r.html`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampTokenSelect":return r.html`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return r.html`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return r.html`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return r.html`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return r.html`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return r.html`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return r.html`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return r.html`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return r.html`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return r.html`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return r.html`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return r.html`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return r.html`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WalletSendConfirmed":return r.html`<w3m-send-confirmed-view></w3m-send-confirmed-view>`;case"WhatIsABuy":return r.html`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return r.html`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return r.html`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return r.html`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return r.html`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return r.html`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return r.html`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return r.html`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return r.html`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return r.html`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return r.html`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return r.html`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return r.html`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return r.html`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return r.html`<w3m-pay-loading-view></w3m-pay-loading-view>`;case"PayQuote":return r.html`<w3m-pay-quote-view></w3m-pay-quote-view>`;case"FundWallet":return r.html`<w3m-fund-wallet-view></w3m-fund-wallet-view>`;case"PayWithExchange":return r.html`<w3m-deposit-from-exchange-view></w3m-deposit-from-exchange-view>`;case"PayWithExchangeSelectAsset":return r.html`<w3m-deposit-from-exchange-select-asset-view></w3m-deposit-from-exchange-select-asset-view>`;case"UsageExceeded":return r.html`<w3m-usage-exceeded-view></w3m-usage-exceeded-view>`;case"SmartAccountSettings":return r.html`<w3m-smart-account-settings-view></w3m-smart-account-settings-view>`}}};rj.styles=[rL],rB([(0,o.state)()],rj.prototype,"viewState",void 0),rB([(0,o.state)()],rj.prototype,"history",void 0),rj=rB([(0,z.customElement)("w3m-router")],rj);let rF=B.css`
  :host {
    z-index: ${({tokens:e})=>e.core.zIndex};
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: ${({tokens:e})=>e.theme.overlay};
    backdrop-filter: blur(0px);
    transition:
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      backdrop-filter ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
    backdrop-filter: blur(8px);
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--apkt-modal-width);
    width: 100%;
    position: relative;
    outline: none;
    transform: translateY(4px);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
    transition:
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: border-radius, background-color, transform, box-shadow;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: var(--local-modal-padding);
    box-sizing: border-box;
  }

  :host(.open) wui-card {
    transform: translateY(0px);
  }

  wui-card::before {
    z-index: 1;
    pointer-events: none;
    content: '';
    position: absolute;
    inset: 0;
    border-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    transition: box-shadow ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    transition-delay: ${({durations:e})=>e.md};
    will-change: box-shadow;
  }

  :host([data-mobile-fullscreen='true']) wui-card::before {
    border-radius: 0px;
  }

  :host([data-border='true']) wui-card::before {
    box-shadow: inset 0px 0px 0px 4px ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  :host([data-border='false']) wui-card::before {
    box-shadow: inset 0px 0px 0px 1px ${({tokens:e})=>e.theme.borderPrimaryDark};
  }

  :host([data-border='true']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-border var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  :host([data-border='false']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-default var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: 0s;
  }

  :host(.appkit-modal) wui-card {
    max-width: var(--apkt-modal-width);
  }

  wui-card[shake='true'] {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      w3m-shake ${({durations:e})=>e.xl}
        ${({easings:e})=>e["ease-out-power-2"]};
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--apkt-spacing-6) 0px;
    }
  }

  @media (max-width: 430px) {
    :host([data-mobile-fullscreen='true']) {
      height: 100dvh;
    }
    :host([data-mobile-fullscreen='true']) wui-flex {
      align-items: stretch;
    }
    :host([data-mobile-fullscreen='true']) wui-card {
      max-width: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
    }
    :host(:not([data-mobile-fullscreen='true'])) wui-flex {
      align-items: flex-end;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card {
      max-width: 100%;
      border-bottom: none;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card[data-embedded='true'] {
      border-bottom-left-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
      border-bottom-right-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card:not([data-embedded='true']) {
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }

    wui-card[shake='true'] {
      animation: w3m-shake 0.5s ${({easings:e})=>e["ease-out-power-2"]};
    }
  }

  @keyframes fade-in {
    0% {
      transform: scale(0.99) translateY(4px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes card-background-border {
    from {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  @keyframes card-background-default {
    from {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
  }
`;var rq=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let r_="scroll-lock",rM={PayWithExchange:"0",PayWithExchangeSelectAsset:"0",Pay:"0",PayQuote:"0",PayLoading:"0"};class rH extends t.LitElement{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.hasPrefetched=!1,this.enableEmbedded=m.OptionsController.state.enableEmbedded,this.open=c.ModalController.state.open,this.caipAddress=s.ChainController.state.activeCaipAddress,this.caipNetwork=s.ChainController.state.activeCaipNetwork,this.shake=c.ModalController.state.shake,this.filterByNamespace=l.ConnectorController.state.filterByNamespace,this.padding=B.vars.spacing[1],this.mobileFullScreen=m.OptionsController.state.enableMobileFullScreen,this.initializeTheming(),n.ApiController.prefetchAnalyticsConfig(),this.unsubscribe.push(c.ModalController.subscribeKey("open",e=>e?this.onOpen():this.onClose()),c.ModalController.subscribeKey("shake",e=>this.shake=e),s.ChainController.subscribeKey("activeCaipNetwork",e=>this.onNewNetwork(e)),s.ChainController.subscribeKey("activeCaipAddress",e=>this.onNewAddress(e)),m.OptionsController.subscribeKey("enableEmbedded",e=>this.enableEmbedded=e),l.ConnectorController.subscribeKey("filterByNamespace",e=>{this.filterByNamespace===e||s.ChainController.getAccountData(e)?.caipAddress||(n.ApiController.fetchRecommendedWallets(),this.filterByNamespace=e)}),d.RouterController.subscribeKey("view",()=>{this.dataset.border=rT.hasFooter()?"true":"false",this.padding=rM[d.RouterController.state.view]??B.vars.spacing[1]}))}firstUpdated(){if(this.dataset.border=rT.hasFooter()?"true":"false",this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.caipAddress){if(this.enableEmbedded){c.ModalController.close(),this.prefetch();return}this.onNewAddress(this.caipAddress)}this.open&&this.onOpen(),this.enableEmbedded&&this.prefetch()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.onRemoveKeyboardListener()}render(){return(this.style.setProperty("--local-modal-padding",this.padding),this.enableEmbedded)?r.html`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `:this.open?r.html`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}contentTemplate(){return r.html` <wui-card
      shake="${this.shake}"
      data-embedded="${(0,a.ifDefined)(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-footer></w3m-footer>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`}async onOverlayClick(e){e.target===e.currentTarget&&(this.mobileFullScreen||await this.handleClose())}async handleClose(){await h.safeClose()}initializeTheming(){let{themeVariables:e,themeMode:t}=D.ThemeController.state,r=W.UiHelperUtil.getColorTheme(t);(0,L.initializeTheming)(e,r)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),w.SnackController.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){let e=document.createElement("style");e.dataset.w3m=r_,e.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(e)}onScrollUnlock(){let e=document.head.querySelector(`style[data-w3m="${r_}"]`);e&&e.remove()}onAddKeyboardListener(){this.abortController=new AbortController;let e=this.shadowRoot?.querySelector("wui-card");e?.focus(),window.addEventListener("keydown",t=>{if("Escape"===t.key)this.handleClose();else if("Tab"===t.key){let{tagName:r}=t.target;!r||r.includes("W3M-")||r.includes("WUI-")||e?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(e){let t=s.ChainController.state.isSwitchingNamespace,r="ProfileWallets"===d.RouterController.state.view;e||t||r||c.ModalController.close(),await p.SIWXUtil.initializeIfEnabled(e),this.caipAddress=e,s.ChainController.setIsSwitchingNamespace(!1)}onNewNetwork(e){let t=this.caipNetwork,r=t?.caipNetworkId?.toString(),i=e?.caipNetworkId?.toString(),o="UnsupportedChain"===d.RouterController.state.view,a=c.ModalController.state.open,n=!1;this.enableEmbedded&&"SwitchNetwork"===d.RouterController.state.view&&(n=!0),r!==i&&O.resetState(),a&&o&&(n=!0),n&&"SIWXSignMessage"!==d.RouterController.state.view&&d.RouterController.goBack(),this.caipNetwork=e}prefetch(){this.hasPrefetched||(n.ApiController.prefetch(),n.ApiController.fetchWalletsByPage({page:1}),this.hasPrefetched=!0)}}rH.styles=rF,rq([(0,i.property)({type:Boolean})],rH.prototype,"enableEmbedded",void 0),rq([(0,o.state)()],rH.prototype,"open",void 0),rq([(0,o.state)()],rH.prototype,"caipAddress",void 0),rq([(0,o.state)()],rH.prototype,"caipNetwork",void 0),rq([(0,o.state)()],rH.prototype,"shake",void 0),rq([(0,o.state)()],rH.prototype,"filterByNamespace",void 0),rq([(0,o.state)()],rH.prototype,"padding",void 0),rq([(0,o.state)()],rH.prototype,"mobileFullScreen",void 0);let rV=class extends rH{};rV=rq([(0,z.customElement)("w3m-modal")],rV);let rK=class extends rH{};rK=rq([(0,z.customElement)("appkit-modal")],rK),e.s(["AppKitModal",0,rK,"W3mModal",0,rV,"W3mModalBase",0,rH],39010);var rQ=t;let rG=B.css`
  .icon-box {
    width: 64px;
    height: 64px;
    border-radius: ${({borderRadius:e})=>e[5]};
    background-color: ${({colors:e})=>e.semanticError010};
  }
`,rY=class extends rQ.LitElement{constructor(){super()}render(){return r.html`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding="${["1","3","4","3"]}"
      >
        <wui-flex justifyContent="center" alignItems="center" class="icon-box">
          <wui-icon size="xxl" color="error" name="warningCircle"></wui-icon>
        </wui-flex>

        <wui-text variant="lg-medium" color="primary" align="center">
          The app isn't responding as expected
        </wui-text>
        <wui-text variant="md-regular" color="secondary" align="center">
          Try again or reach out to the app team for help.
        </wui-text>

        <wui-button
          variant="neutral-secondary"
          size="md"
          @click=${this.onTryAgainClick.bind(this)}
          data-testid="w3m-usage-exceeded-button"
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try Again
        </wui-button>
      </wui-flex>
    `}onTryAgainClick(){d.RouterController.goBack()}};rY.styles=rG,rY=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n}([(0,z.customElement)("w3m-usage-exceeded-view")],rY),e.s(["W3mUsageExceededView",0,rY],71886);var rX=t,rZ=e.i(65166);e.i(87789);let rJ=B.css`
  :host {
    width: 100%;
  }
`;var r0=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let r3=class extends rX.LitElement{constructor(){super(...arguments),this.hasImpressionSent=!1,this.walletImages=[],this.imageSrc="",this.name="",this.size="md",this.tabIdx=void 0,this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100",this.rdnsId="",this.displayIndex=void 0,this.walletRank=void 0,this.namespaces=[]}connectedCallback(){super.connectedCallback()}disconnectedCallback(){super.disconnectedCallback(),this.cleanupIntersectionObserver()}updated(e){super.updated(e),(e.has("name")||e.has("imageSrc")||e.has("walletRank"))&&(this.hasImpressionSent=!1),e.has("walletRank")&&this.walletRank&&!this.intersectionObserver&&this.setupIntersectionObserver()}setupIntersectionObserver(){this.intersectionObserver=new IntersectionObserver(e=>{e.forEach(e=>{!e.isIntersecting||this.loading||this.hasImpressionSent||this.sendImpressionEvent()})},{threshold:.1}),this.intersectionObserver.observe(this)}cleanupIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=void 0)}sendImpressionEvent(){this.name&&!this.hasImpressionSent&&this.walletRank&&(this.hasImpressionSent=!0,(this.rdnsId||this.name)&&I.EventsController.sendWalletImpressionEvent({name:this.name,walletRank:this.walletRank,rdnsId:this.rdnsId,view:d.RouterController.state.view,displayIndex:this.displayIndex}))}handleGetWalletNamespaces(){return Object.keys(rZ.AdapterController.state.adapters).length>1?this.namespaces:[]}render(){return r.html`
      <wui-list-wallet
        .walletImages=${this.walletImages}
        imageSrc=${(0,a.ifDefined)(this.imageSrc)}
        name=${this.name}
        size=${(0,a.ifDefined)(this.size)}
        tagLabel=${(0,a.ifDefined)(this.tagLabel)}
        .tagVariant=${this.tagVariant}
        .walletIcon=${this.walletIcon}
        .tabIdx=${this.tabIdx}
        .disabled=${this.disabled}
        .showAllWallets=${this.showAllWallets}
        .loading=${this.loading}
        loadingSpinnerColor=${this.loadingSpinnerColor}
        .namespaces=${this.handleGetWalletNamespaces()}
      ></wui-list-wallet>
    `}};r3.styles=rJ,r0([(0,i.property)({type:Array})],r3.prototype,"walletImages",void 0),r0([(0,i.property)()],r3.prototype,"imageSrc",void 0),r0([(0,i.property)()],r3.prototype,"name",void 0),r0([(0,i.property)()],r3.prototype,"size",void 0),r0([(0,i.property)()],r3.prototype,"tagLabel",void 0),r0([(0,i.property)()],r3.prototype,"tagVariant",void 0),r0([(0,i.property)()],r3.prototype,"walletIcon",void 0),r0([(0,i.property)()],r3.prototype,"tabIdx",void 0),r0([(0,i.property)({type:Boolean})],r3.prototype,"disabled",void 0),r0([(0,i.property)({type:Boolean})],r3.prototype,"showAllWallets",void 0),r0([(0,i.property)({type:Boolean})],r3.prototype,"loading",void 0),r0([(0,i.property)({type:String})],r3.prototype,"loadingSpinnerColor",void 0),r0([(0,i.property)()],r3.prototype,"rdnsId",void 0),r0([(0,i.property)()],r3.prototype,"displayIndex",void 0),r0([(0,i.property)()],r3.prototype,"walletRank",void 0),r0([(0,i.property)({type:Array})],r3.prototype,"namespaces",void 0),r3=r0([(0,z.customElement)("w3m-list-wallet")],r3),e.s(["W3mListWallet",0,r3],30520);var r1=t;let r2=B.css`
  :host {
    --local-duration-height: 0s;
    --local-duration: ${({durations:e})=>e.lg};
    --local-transition: ${({easings:e})=>e["ease-out-power-2"]};
  }

  .container {
    display: block;
    overflow: hidden;
    overflow: hidden;
    position: relative;
    height: var(--local-container-height);
    transition: height var(--local-duration-height) var(--local-transition);
    will-change: height, padding-bottom;
  }

  .container[data-mobile-fullscreen='true'] {
    overflow: scroll;
  }

  .page {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    width: inherit;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-bottom-left-radius: var(--local-border-bottom-radius);
    border-bottom-right-radius: var(--local-border-bottom-radius);
    transition: border-bottom-left-radius var(--local-duration) var(--local-transition);
  }

  .page[data-mobile-fullscreen='true'] {
    height: 100%;
  }

  .page-content {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .footer {
    height: var(--apkt-footer-height);
  }

  div.page[view-direction^='prev-'] .page-content {
    animation:
      slide-left-out var(--local-duration) forwards var(--local-transition),
      slide-left-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  div.page[view-direction^='next-'] .page-content {
    animation:
      slide-right-out var(--local-duration) forwards var(--local-transition),
      slide-right-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }
`;var r5=function(e,t,r,i){var o,a=arguments.length,n=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,r,n):o(t,r))||n);return a>3&&n&&Object.defineProperty(t,r,n),n};let r4=class extends r1.LitElement{constructor(){super(...arguments),this.resizeObserver=void 0,this.transitionDuration="0.15s",this.transitionFunction="",this.history="",this.view="",this.setView=void 0,this.viewDirection="",this.historyState="",this.previousHeight="0px",this.mobileFullScreen=m.OptionsController.state.enableMobileFullScreen,this.onViewportResize=()=>{this.updateContainerHeight()}}updated(e){if(e.has("history")){let e=this.history;""!==this.historyState&&this.historyState!==e&&this.onViewChange(e)}e.has("transitionDuration")&&this.style.setProperty("--local-duration",this.transitionDuration),e.has("transitionFunction")&&this.style.setProperty("--local-transition",this.transitionFunction)}firstUpdated(){this.transitionFunction&&this.style.setProperty("--local-transition",this.transitionFunction),this.style.setProperty("--local-duration",this.transitionDuration),this.historyState=this.history,this.resizeObserver=new ResizeObserver(e=>{for(let t of e)if(t.target===this.getWrapper()){let e=t.contentRect.height,r=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0");this.mobileFullScreen?(e=(window.visualViewport?.height||window.innerHeight)-this.getHeaderHeight()-r,this.style.setProperty("--local-border-bottom-radius","0px")):(e+=r,this.style.setProperty("--local-border-bottom-radius",r?"var(--apkt-borderRadius-5)":"0px")),this.style.setProperty("--local-container-height",`${e}px`),"0px"!==this.previousHeight&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${e}px`}}),this.resizeObserver.observe(this.getWrapper()),this.updateContainerHeight(),window.addEventListener("resize",this.onViewportResize),window.visualViewport?.addEventListener("resize",this.onViewportResize)}disconnectedCallback(){let e=this.getWrapper();e&&this.resizeObserver&&this.resizeObserver.unobserve(e),window.removeEventListener("resize",this.onViewportResize),window.visualViewport?.removeEventListener("resize",this.onViewportResize)}render(){return r.html`
      <div class="container" data-mobile-fullscreen="${(0,a.ifDefined)(this.mobileFullScreen)}">
        <div
          class="page"
          data-mobile-fullscreen="${(0,a.ifDefined)(this.mobileFullScreen)}"
          view-direction="${this.viewDirection}"
        >
          <div class="page-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `}onViewChange(e){let t=e.split(",").filter(Boolean),r=this.historyState.split(",").filter(Boolean),i=r.length,o=t.length,a=t[t.length-1]||"",n=W.UiHelperUtil.cssDurationToNumber(this.transitionDuration),s="";o>i?s="next":o<i?s="prev":o===i&&t[o-1]!==r[i-1]&&(s="next"),this.viewDirection=`${s}-${a}`,setTimeout(()=>{this.historyState=e,this.setView?.(a)},n),setTimeout(()=>{this.viewDirection=""},2*n)}getWrapper(){return this.shadowRoot?.querySelector("div.page")}updateContainerHeight(){let e=this.getWrapper();if(!e)return;let t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0"),r=0;this.mobileFullScreen?(r=(window.visualViewport?.height||window.innerHeight)-this.getHeaderHeight()-t,this.style.setProperty("--local-border-bottom-radius","0px")):(r=e.getBoundingClientRect().height+t,this.style.setProperty("--local-border-bottom-radius",t?"var(--apkt-borderRadius-5)":"0px")),this.style.setProperty("--local-container-height",`${r}px`),"0px"!==this.previousHeight&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${r}px`}getHeaderHeight(){return 60}};r4.styles=[r2],r5([(0,i.property)({type:String})],r4.prototype,"transitionDuration",void 0),r5([(0,i.property)({type:String})],r4.prototype,"transitionFunction",void 0),r5([(0,i.property)({type:String})],r4.prototype,"history",void 0),r5([(0,i.property)({type:String})],r4.prototype,"view",void 0),r5([(0,i.property)({attribute:!1})],r4.prototype,"setView",void 0),r5([(0,o.state)()],r4.prototype,"viewDirection",void 0),r5([(0,o.state)()],r4.prototype,"historyState",void 0),r5([(0,o.state)()],r4.prototype,"previousHeight",void 0),r5([(0,o.state)()],r4.prototype,"mobileFullScreen",void 0),r4=r5([(0,z.customElement)("w3m-router-container")],r4),e.s(["W3mRouterContainer",0,r4],95604),e.s([],34570),e.i(34570),e.i(39010),e.i(71886),e.i(30520),e.i(95604),e.s(["AppKitModal",0,rK,"W3mListWallet",0,r3,"W3mModal",0,rV,"W3mModalBase",0,rH,"W3mRouterContainer",0,r4,"W3mUsageExceededView",0,rY],71502)}]);