// File containing polyfills for the userscript

function fetchOptions(url) {
    return new Promise((resolve, reject)=>{
        opt = {
            method: "OPTIONS",
            url: url,
        }
        opt.onload = (resp) => resolve(resp.responseHeaders)
        opt.ontimeout =  () => reject("fetch timeout")
        opt.onerror   =  () => reject("fetch error")
        opt.onabort   =  () => reject("fetch abort")
        GM_xmlhttpRequest(opt)
    })
}

function parseHeaders(headers) {
    if (!headers)
        return {}
    let result = {}
    let headersArr = headers.trim().split('\n')
    for (var i = 0; i < headersArr.length; i++) {
        var row = headersArr[i]
        var index = row.indexOf(':')
        , key = row.slice(0, index).trim().toLowerCase()
        , value = row.slice(index + 1).trim()

        if (typeof(result[key]) === 'undefined') {
            result[key] = value
        } else if (Array.isArray(result[key])) {
            result[key].push(value)
        } else {
            result[key] = [ result[key], value ]
        }
    }
    return result
}

// returns true if CORS permits request
async function checkCors(url, method) {
    let headers = parseHeaders(await fetchOptions(url))
    
    let origin = headers['access-control-allow-origin'];
    if (origin !== "*" && origin !== "https://discord.com") return false;

    let methods = headers['access-control-allow-methods']?.split(/,\s/g)
    if (methods && !methods.includes(method)) return false;

    return true
}

function GM_fetch(url, opt) {
    function blobTo(to, blob) {
        if (to == "arrayBuffer" && blob.arrayBuffer) return blob.arrayBuffer()
        return new Promise((resolve, reject) => {
            var fileReader = new FileReader()
            fileReader.onload = function (event) { if (to == "base64") resolve(event.target.result); else resolve(event.target.result) }
            if (to == "arrayBuffer") fileReader.readAsArrayBuffer(blob)
            else if (to == "base64") fileReader.readAsDataURL(blob) // "data:*/*;base64,......"
            else if (to == "text") fileReader.readAsText(blob, "utf-8")
            else reject("unknown to")
        })
    }
    return new Promise((resolve, reject)=>{
        checkCors(url, opt?.method || "GET")
            .then(can => {
                if (can) {
                    // https://www.tampermonkey.net/documentation.php?ext=dhdg#GM_xmlhttpRequest
                    opt = opt || {}
                    opt.url = url
                    opt.data = opt.body
                    opt.responseType = "blob"
                    opt.onload = (resp)=>{
                        var blob = resp.response
                        resp.blob = ()=>Promise.resolve(blob)
                        resp.arrayBuffer = ()=>blobTo("arrayBuffer", blob)
                        resp.text = ()=>blobTo("text", blob)
                        resp.json = async ()=>JSON.parse(await blobTo("text", blob))
                        resolve(resp)
                    }
                    opt.ontimeout = ()=>reject("fetch timeout")
                    opt.onerror   = ()=>reject("fetch error")
                    opt.onabort   = ()=>reject("fetch abort")
                    GM_xmlhttpRequest(opt)
                } else {
                    reject("CORS issue")
                }
            })
    })
}
export const fetch = GM_fetch