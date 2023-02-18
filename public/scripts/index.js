// initialize
let queries = {};
function page_init() {
    queries = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
}
page_init();
//

