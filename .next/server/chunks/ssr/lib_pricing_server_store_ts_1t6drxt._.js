module.exports=[19197,54866,43861,78008,a=>{"use strict";var b=a.i(93321),c=a.i(30385),d=a.i(51674),e=a.i(46767),f=a.i(84476),g=a.i(29673),h=a.i(19281);let i=["burn","mint","pause","maxTx","maxWallet","blacklist","whitelist"],j=["transferOwnership","renounceOwnership"],k=["buySellTax","marketingWallet","feeExemption","antiBot","autoLiquidity"],l=[["blacklist","whitelist"]],m=new Set(i),n=new Set(j),o=new Set(k);function p(a){return m.has(a)?"paid":n.has(a)?"included":o.has(a)?"comingSoon":"unknown"}function q(a){let b=[];for(let c of(("string"!=typeof a.version||0===a.version.trim().length)&&b.push(new h.PricingError("invalid-config-version","pricing version must be a non-empty string")),a.baseFeeWei<0n&&b.push(new h.PricingError("negative-fee","base fee must not be negative")),Object.keys(a.featureFees))){i.includes(c)||b.push(new h.PricingError("unknown-feature-fee","fee configured for an unknown feature",c));let d=a.featureFees[c];void 0!==d&&d<0n&&b.push(new h.PricingError("negative-fee","feature fee must not be negative",c))}for(let c of i)void 0===a.featureFees[c]&&b.push(new h.PricingError("missing-feature-fee","no fee configured for a paid feature",c));return 0===b.length?{ok:!0}:{ok:!1,errors:b}}function r(a,b,c){let d=q(a);if(!d.ok)throw d.errors[0];let e=function(a,b){let c=q(a);if(!c.ok)return c;let d=[],e=new Set,f=new Set;for(let a of b){e.has(a)&&d.push(new h.PricingError("duplicate-feature","a feature must be selected at most once",a)),e.add(a);let b=p(a);if("unknown"===b){d.push(new h.PricingError("unknown-feature","unknown feature id",a));continue}if("included"===b){d.push(new h.PricingError("included-feature-selected","included features cannot be priced add-ons",a));continue}if("comingSoon"===b){d.push(new h.PricingError("coming-soon-feature-selected","coming soon features are not purchasable",a));continue}f.add(a)}for(let a of l)a.every(a=>f.has(a))&&d.push(new h.PricingError("incompatible-features",`${a.join(" and ")} are mutually exclusive`,a.join(",")));return 0===d.length?{ok:!0}:{ok:!1,errors:d}}(a,b);if(!e.ok)throw e.errors[0];let f=new Set(b),g=i.filter(a=>f.has(a)),k=g.map(b=>({feature:b,priceWei:a.featureFees[b]})),m=k.reduce((a,b)=>a+b.priceWei,a.baseFeeWei),n=function(a,b){if(void 0===a||"inactive"===a.status)return null;if("active"!==a.status)throw new h.PricingError("invalid-campaign","unknown campaign status");let c=a.referenceWei,d=a.effectiveWei;if("bigint"!=typeof c||"bigint"!=typeof d)throw new h.PricingError("invalid-campaign","active campaign requires reference and effective wei");if(c<0n||d<0n)throw new h.PricingError("invalid-campaign","campaign amounts must not be negative");if(d>c)throw new h.PricingError("invalid-campaign","effective price cannot exceed the reference price");let e=c-d;if(e>b)throw new h.PricingError("invalid-campaign","discount cannot exceed the platform fee subtotal");let f={referenceWei:c,effectiveWei:d,discountWei:e};return void 0!==a.start&&(f.start=a.start),void 0!==a.end&&(f.end=a.end),f}(c,m),o=null===n?0n:n.discountWei,r=m-o;if(r<0n)throw new h.PricingError("invalid-campaign","total platform fee must not be negative");return{pricingVersion:a.version,baseFeeWei:a.baseFeeWei,selectedFeatures:g,includedFeatures:j,lineItems:k,subtotalWei:m,discountWei:o,totalPlatformFeeWei:r,campaign:n}}a.s(["COMING_SOON_FEATURES",0,k,"INCLUDED_FEATURES",0,j,"INCOMPATIBLE_GROUPS",0,l,"PAID_FEATURES",0,i,"kindOfFeature",0,p],54866),a.s(["calculatePlatformFee",0,r,"validateConfig",0,q],43861);var s=a.i(61076);function t(a,b=new Date){let c=b.getTime();return a.enabled?c<a.startsAt.getTime()?"scheduled":c>=a.endsAt.getTime()?"ended":"active":"disabled"}function u(a,b){let c={};for(let b of i)c[b]=a[b];return{version:b,baseFeeWei:a.base,featureFees:c}}(0,s.parseBnbToWei)("1"),(0,s.parseBnbToWei)("5"),a.s(["deriveCampaignStatus",0,t,"pricingFeeMapToConfig",0,u,"quoteWithPercentCampaign",0,function(a,b,c){let d=r(a,b),e=function(a,b){if(!Number.isInteger(b))throw Error("basis points must be an integer");if(b<1||b>9e3)throw Error("basis points must be within 1..9000");if(a<0n)throw Error("subtotal must not be negative");return a*BigInt(b)/BigInt(1e4)}(d.subtotalWei,c.basisPoints);return r(a,b,{status:"active",referenceWei:d.subtotalWei,effectiveWei:d.subtotalWei-e,...void 0!==c.start?{start:c.start}:{},...void 0!==c.end?{end:c.end}:{}})}],78008);class v extends Error{code;httpStatus;constructor(a,b,c){super(c),this.name="PricingStoreError",this.code=a,this.httpStatus=b}}function w(a){if("object"!=typeof a||null===a)return!1;if("23505"===a.code)return!0;let b=a.message;return"string"==typeof b&&/duplicate key value/i.test(b)}function x(a){return a instanceof v?a:(a instanceof f.DatabaseUnavailableError,new v("unavailable",503,"pricing service is temporarily unavailable"))}function y(a){if("number"==typeof a)return Number.isSafeInteger(a)&&a>=0?a:null;if("string"==typeof a&&/^(0|[1-9][0-9]*)$/.test(a)){let b=Number(a);return Number.isSafeInteger(b)?b:null}return null}function z(a,b){try{let c=b instanceof Error?b.name:typeof b,d="none";if("object"==typeof b&&null!==b){let a=b.code;("string"==typeof a||"number"==typeof a)&&(d=String(a).slice(0,32))}let e=b instanceof Error?` ${b.message.replace(/:\/\/[^\s/@]*@[^\s/]*/g,"://***@***").replace(/password\s*=\s*[^\s;,}]*/gi,"password=***").slice(0,300)}`:"";console.error(`[phase7c-pricing-store] ${a} failed (${c} code=${d}):${e}`)}catch{}}function A(a,b){return"number"==typeof a&&Number.isFinite(a)?Math.min(Math.max(Math.floor(a),1),b):b}function B(a){if(Array.isArray(a))return a;let b=a?.rows;return Array.isArray(b)?b:[]}function C(a){return a.toString()}class D{injectedDb;injectedTx;constructor(a,b){this.injectedDb=a,this.injectedTx=b}database(){return this.injectedDb??(0,f.getDb)()}txClient(){return this.injectedTx??function(){let a=(process.env.DATABASE_URL??"").trim();if(!a)throw new f.DatabaseUnavailableError("DATABASE_URL is not set");return(0,e.neon)(a)}()}async getActiveVersion(){try{let a=this.database();return(await a.select().from(g.pricingVersions).where((0,b.eq)(g.pricingVersions.status,"active")).limit(1))[0]??null}catch(a){throw z("getActiveVersion",a),x(a)}}async listVersions(a){try{let b=this.database();return await b.select().from(g.pricingVersions).orderBy((0,c.desc)(g.pricingVersions.createdAt),(0,c.desc)(g.pricingVersions.id)).limit(A(a,50))}catch(a){throw z("listVersions",a),x(a)}}async publishVersion(a){try{var b;let c=this.database(),e=null;try{e=(await this.getActiveVersion())?.version??null}catch{e=null}let f=JSON.stringify({previousVersion:e,baseFeeWei:C(a.fees.base),featureFeesWei:{burn:C(a.fees.burn),mint:C(a.fees.mint),pause:C(a.fees.pause),maxTx:C(a.fees.maxTx),maxWallet:C(a.fees.maxWallet),blacklist:C(a.fees.blacklist),whitelist:C(a.fees.whitelist)}}),g=B(await c.execute(d.sql`SELECT nextval('pricing_version_seq') AS n`)),h=y(g[0]?.n);if(null===h)throw new v("unavailable",503,"pricing service is temporarily unavailable");let i=`v${h}`,j=this.txClient(),k=await j.transaction((b={baseFeeWei:C(a.fees.base),burnFeeWei:C(a.fees.burn),mintFeeWei:C(a.fees.mint),pauseFeeWei:C(a.fees.pause),maxTxFeeWei:C(a.fees.maxTx),maxWalletFeeWei:C(a.fees.maxWallet),blacklistFeeWei:C(a.fees.blacklist),whitelistFeeWei:C(a.fees.whitelist),adminId:a.adminId,version:i,metadata:f},[j`INSERT INTO pricing_versions (
        version, base_fee_wei, burn_fee_wei, mint_fee_wei, pause_fee_wei,
        maxtx_fee_wei, maxwallet_fee_wei, blacklist_fee_wei,
        whitelist_fee_wei, created_by_admin_id
      )
      VALUES (
        ${b.version}, ${b.baseFeeWei}, ${b.burnFeeWei},
        ${b.mintFeeWei}, ${b.pauseFeeWei},
        ${b.maxTxFeeWei}, ${b.maxWalletFeeWei},
        ${b.blacklistFeeWei}, ${b.whitelistFeeWei},
        ${b.adminId}
      )`,j`UPDATE pricing_versions SET status = 'inactive'
      WHERE status = 'active' AND version <> ${b.version}`,j`UPDATE pricing_versions SET status = 'active', activated_at = now()
      WHERE version = ${b.version}`,j`INSERT INTO admin_audit_events (
        admin_user_id, action, entity_type, entity_id, metadata
      )
      VALUES (
        ${b.adminId}, 'pricing_version_published',
        'pricing_version', ${b.version}, ${b.metadata}::jsonb
      )`,j`SELECT id, version FROM pricing_versions
      WHERE version = ${b.version} AND status = 'active'`])),l=B(k[4])[0],m=y(l?.id);if(void 0===l||null===m||String(l.version)!==i)throw new v("unavailable",503,"pricing service is temporarily unavailable");return{id:m,version:i}}catch(a){if(w(a))throw new v("conflict",409,"pricing was published concurrently; please review and retry");throw z("publishVersion",a),x(a)}}async listCampaigns(){try{let a=this.database();return await a.select().from(g.campaigns).orderBy((0,c.desc)(g.campaigns.startsAt),(0,c.desc)(g.campaigns.id))}catch(a){throw z("listCampaigns",a),x(a)}}async createCampaign(a){try{let c=this.database(),e=JSON.stringify({name:a.name,code:a.code,discountBasisPoints:a.basisPoints,startsAt:a.startsAt.toISOString(),endsAt:a.endsAt.toISOString()}),f=await c.execute(d.sql`
        WITH ins AS (
          INSERT INTO campaigns (
            name, code, discount_type, discount_basis_points, applies_to,
            starts_at, ends_at, enabled, created_by_admin_id
          )
          VALUES (
            ${a.name}, ${a.code}, 'percent', ${a.basisPoints},
            'whole_quote', ${a.startsAt.toISOString()},
            ${a.endsAt.toISOString()}, TRUE, ${a.adminId}
          )
          RETURNING id
        ),
        audit AS (
          INSERT INTO admin_audit_events (
            admin_user_id, action, entity_type, entity_id, metadata
          )
          SELECT ${a.adminId}, 'campaign_created', 'campaign',
                 (SELECT id::text FROM ins), (${e}::jsonb)
        )
        SELECT id FROM ins
      `),h=B(f),i=y(h[0]?.id);if(null===i)throw new v("unavailable",503,"pricing service is temporarily unavailable");let j=(await c.select().from(g.campaigns).where((0,b.eq)(g.campaigns.id,i)).limit(1))[0];if(!j)throw new v("unavailable",503,"pricing service is temporarily unavailable");return j}catch(a){if(w(a))throw new v("conflict",409,"a campaign with this code already exists");throw z("createCampaign",a),x(a)}}async patchCampaign(a,c,e){if(!Number.isSafeInteger(a)||a<1)throw new v("not-found",404,"campaign not found");let f=void 0!==c.name||void 0!==c.code||void 0!==c.basisPoints||void 0!==c.startsAt||void 0!==c.endsAt;if(!f&&void 0===c.enabled)throw new v("not-found",404,"campaign not found");try{let h=this.database(),i=f?"campaign_updated":!0===c.enabled?"campaign_enabled":"campaign_disabled",j=JSON.stringify({name:c.name??null,code:c.code??null,discountBasisPoints:c.basisPoints??null,startsAt:c.startsAt?.toISOString()??null,endsAt:c.endsAt?.toISOString()??null,enabled:c.enabled??null}),k=await h.execute(f?d.sql`
            WITH upd AS (
              UPDATE campaigns SET
                name = CASE WHEN ${void 0!==c.name} THEN ${c.name??null} ELSE name END,
                code = CASE WHEN ${void 0!==c.code} THEN ${c.code??null} ELSE code END,
                discount_basis_points = CASE WHEN ${void 0!==c.basisPoints} THEN ${c.basisPoints??null} ELSE discount_basis_points END,
                starts_at = CASE WHEN ${void 0!==c.startsAt} THEN ${c.startsAt?.toISOString()??null}::timestamptz ELSE starts_at END,
                ends_at = CASE WHEN ${void 0!==c.endsAt} THEN ${c.endsAt?.toISOString()??null}::timestamptz ELSE ends_at END,
                enabled = CASE WHEN ${void 0!==c.enabled} THEN ${c.enabled??null} ELSE enabled END,
                updated_at = now()
              WHERE id = ${a} AND starts_at > now()
              RETURNING id
            ),
            audit AS (
              INSERT INTO admin_audit_events (
                admin_user_id, action, entity_type, entity_id, metadata
              )
              SELECT ${e}, ${i}, 'campaign',
                     (SELECT id::text FROM upd), (${j}::jsonb)
              WHERE EXISTS (SELECT 1 FROM upd)
            )
            SELECT id FROM upd
          `:d.sql`
            WITH upd AS (
              UPDATE campaigns SET
                enabled = ${c.enabled??null},
                updated_at = now()
              WHERE id = ${a}
              RETURNING id
            ),
            audit AS (
              INSERT INTO admin_audit_events (
                admin_user_id, action, entity_type, entity_id, metadata
              )
              SELECT ${e}, ${i}, 'campaign',
                     (SELECT id::text FROM upd), (${j}::jsonb)
              WHERE EXISTS (SELECT 1 FROM upd)
            )
            SELECT id FROM upd
          `);if(!(function(a){if("object"==typeof a&&null!==a){let b=a.rowCount;if("number"==typeof b)return b}return 0}(k)>0||B(k).length>0)){let c=await h.select({id:g.campaigns.id}).from(g.campaigns).where((0,b.eq)(g.campaigns.id,a)).limit(1);if(0===c.length)throw new v("not-found",404,"campaign not found");throw new v("conflict",409,"only future campaigns may change economic terms; disable this campaign instead")}let l=(await h.select().from(g.campaigns).where((0,b.eq)(g.campaigns.id,a)).limit(1))[0];if(!l)throw new v("not-found",404,"campaign not found");return l}catch(a){if(w(a))throw new v("conflict",409,"a campaign with this code already exists");throw z("patchCampaign",a),x(a)}}async resolveCampaignForQuote(a){try{let c=this.database(),d=await c.select().from(g.campaigns).where((0,b.and)((0,b.eq)(g.campaigns.enabled,!0),(0,b.lte)(g.campaigns.startsAt,a.now),(0,b.gt)(g.campaigns.endsAt,a.now)));if(null!==a.code){let b=d.find(b=>b.code===a.code);if(!b)throw new v("invalid-campaign-code",400,"campaign code is not currently valid");return b}return d.filter(a=>null===a.code).sort((a,b)=>{if(b.discountBasisPoints!==a.discountBasisPoints)return b.discountBasisPoints-a.discountBasisPoints;let c=a.endsAt.getTime()-b.endsAt.getTime();return 0!==c?c:a.id-b.id})[0]??null}catch(a){throw z("resolveCampaignForQuote",a),x(a)}}async listAuditEvents(a){try{let b=this.database();return await b.select().from(g.adminAuditEvents).orderBy((0,c.desc)(g.adminAuditEvents.createdAt),(0,c.desc)(g.adminAuditEvents.id)).limit(A(a,50))}catch(a){throw z("listAuditEvents",a),x(a)}}}async function E(a,b={}){let c,d=b.now??new Date,e=b.campaignCode??null;try{c=await a.pricing.getActiveVersion()}catch(a){throw a instanceof v&&a.code,a}if(!c)throw new v("no-active-pricing",503,"pricing service is temporarily unavailable");let f=function(a){try{let b=u({base:(0,s.parseWeiStringToBigint)(a.baseFeeWei),burn:(0,s.parseWeiStringToBigint)(a.burnFeeWei),mint:(0,s.parseWeiStringToBigint)(a.mintFeeWei),pause:(0,s.parseWeiStringToBigint)(a.pauseFeeWei),maxTx:(0,s.parseWeiStringToBigint)(a.maxTxFeeWei),maxWallet:(0,s.parseWeiStringToBigint)(a.maxWalletFeeWei),blacklist:(0,s.parseWeiStringToBigint)(a.blacklistFeeWei),whitelist:(0,s.parseWeiStringToBigint)(a.whitelistFeeWei)},a.version);if(!q(b).ok)throw Error("stored pricing version failed validation");return b}catch(a){if(a instanceof v)throw a;throw new v("unavailable",503,"pricing service is temporarily unavailable")}}(c),g=await a.pricing.resolveCampaignForQuote({code:e,now:d}),h=g&&"active"===t({enabled:g.enabled,startsAt:g.startsAt,endsAt:g.endsAt},d)?{id:g.id,name:g.name,code:g.code,basisPoints:g.discountBasisPoints,startsAt:g.startsAt,endsAt:g.endsAt}:null;return{config:f,version:c.version,campaign:h,fallback:!1}}a.s(["getPricingStores",0,function(){return{pricing:new D}},"loadAuthoritativeSnapshot",0,E],19197)}];

//# sourceMappingURL=lib_pricing_server_store_ts_1t6drxt._.js.map