/* esm.sh - @supabase/functions-js@2.76.1 */
import {__awaiter as j} from "/tslib@2.8.1/es2022/tslib.mjs";
var g = e => {
    let t;
    return e ? t = e : typeof fetch > "u" ? t = (...a) => import("/@supabase/node-fetch@2.6.15/es2022/node-fetch.mjs").then( ({default: n}) => n(...a)) : t = fetch,
    (...a) => t(...a)
}
;
var p = class extends Error {
    constructor(t, a="FunctionsError", n) {
        super(t),
        this.name = a,
        this.context = n
    }
}
, u = class extends p {
    constructor(t) {
        super("Failed to send a request to the Edge Function", "FunctionsFetchError", t)
    }
}
, h = class extends p {
    constructor(t) {
        super("Relay Error invoking the Edge Function", "FunctionsRelayError", t)
    }
}
, f = class extends p {
    constructor(t) {
        super("Edge Function returned a non-2xx status code", "FunctionsHttpError", t)
    }
}
, x;
(function(e) {
    e.Any = "any",
    e.ApNortheast1 = "ap-northeast-1",
    e.ApNortheast2 = "ap-northeast-2",
    e.ApSouth1 = "ap-south-1",
    e.ApSoutheast1 = "ap-southeast-1",
    e.ApSoutheast2 = "ap-southeast-2",
    e.CaCentral1 = "ca-central-1",
    e.EuCentral1 = "eu-central-1",
    e.EuWest1 = "eu-west-1",
    e.EuWest2 = "eu-west-2",
    e.EuWest3 = "eu-west-3",
    e.SaEast1 = "sa-east-1",
    e.UsEast1 = "us-east-1",
    e.UsWest1 = "us-west-1",
    e.UsWest2 = "us-west-2"
}
)(x || (x = {}));
var w = class {
    constructor(t, {headers: a={}, customFetch: n, region: d=x.Any}={}) {
        this.url = t,
        this.headers = a,
        this.region = d,
        this.fetch = g(n)
    }
    setAuth(t) {
        this.headers.Authorization = `Bearer ${t}`
    }
    invoke(t) {
        return j(this, arguments, void 0, function*(a, n={}) {
            var d;
            try {
                let {headers: r, method: v, body: o, signal: C} = n
                  , y = {}
                  , {region: i} = n;
                i || (i = this.region);
                let A = new URL(`${this.url}/${a}`);
                i && i !== "any" && (y["x-region"] = i,
                A.searchParams.set("forceFunctionRegion", i));
                let l;
                o && (r && !Object.prototype.hasOwnProperty.call(r, "Content-Type") || !r) ? typeof Blob < "u" && o instanceof Blob || o instanceof ArrayBuffer ? (y["Content-Type"] = "application/octet-stream",
                l = o) : typeof o == "string" ? (y["Content-Type"] = "text/plain",
                l = o) : typeof FormData < "u" && o instanceof FormData ? l = o : (y["Content-Type"] = "application/json",
                l = JSON.stringify(o)) : l = o;
                let s = yield this.fetch(A.toString(), {
                    method: v || "POST",
                    headers: Object.assign(Object.assign(Object.assign({}, y), this.headers), r),
                    body: l,
                    signal: C
                }).catch(E => {
                    throw E.name === "AbortError" ? E : new u(E)
                }
                )
                  , b = s.headers.get("x-relay-error");
                if (b && b === "true")
                    throw new h(s);
                if (!s.ok)
                    throw new f(s);
                let m = ((d = s.headers.get("Content-Type")) !== null && d !== void 0 ? d : "text/plain").split(";")[0].trim(), c;
                return m === "application/json" ? c = yield s.json() : m === "application/octet-stream" || m === "application/pdf" ? c = yield s.blob() : m === "text/event-stream" ? c = s : m === "multipart/form-data" ? c = yield s.formData() : c = yield s.text(),
                {
                    data: c,
                    error: null,
                    response: s
                }
            } catch (r) {
                return r instanceof Error && r.name === "AbortError" ? {
                    data: null,
                    error: new u(r)
                } : {
                    data: null,
                    error: r,
                    response: r instanceof f || r instanceof h ? r.context : void 0
                }
            }
        })
    }
}
;
export {x as FunctionRegion, w as FunctionsClient, p as FunctionsError, u as FunctionsFetchError, f as FunctionsHttpError, h as FunctionsRelayError};
//# sourceMappingURL=functions-js.mjs.map
