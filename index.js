addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond with one of two variants
 * @param request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
  let variant;
  let init = {
    headers: {
      'content-type': 'text/html'
    }
  };
  const cookieVariant = findCookie(request);

  if (cookieVariant) {
    variant = cookieVariant;
  } else {
    const variantOptions = (await getVariants())["variants"];
    const selectedVariant = Math.random() < 0.5 ? variantOptions[0] : variantOptions[1];
    init.headers['Set-Cookie'] = `variant=${selectedVariant}`;
    variant = selectedVariant;
  }

  let response = await fetch(variant, init);
  response = rewriter.transform(response);
  return new Response(await response.text(), init);
}

/**
 * Fetch variant options
 * @returns {Promise<any>}
 */
async function getVariants() {
  const request = await fetch(variantURL);
  return request.json();
}

// Cloudflare A/B Testing https://developers.cloudflare.com/workers/templates/pages/ab_testing/
/**
 * Attemps to find the persisting variant
 *
 * @param request
 * @returns {(string|null)} The variant if it exists, or null
 */
function findCookie(request) {
  let result = null;
  const cookieString = request.headers.get('cookie');
  if (cookieString) {
    let cookieSplit = cookieString.split(';');
    cookieSplit.forEach(cookie => {
      let [cookieName, cookieValue] = cookie.split('=');
      cookieName = cookieName.trim();
      if (cookieName === 'variant') {
        result = cookieValue;
      }
    })
  }
  return result;
}

class TitleRewriter {
  element(element) {
    element.setInnerContent(newTitle);
  }
}

class MainTitleRewriter {
  element(element) {
    element.prepend(prependMainTitle);
  }
}

class DescriptionRewriter {
  constructor() {
    this.buffer = "";
  }

  text(txt) {
    this.buffer += txt.text
    if (txt.lastInTextNode) {
      txt.after(`(${this.buffer.length} characters)`);
      this.buffer = "";
    }
  }
}

class LinkRewriter {
  element(element) {
    element.setAttribute('href', newLink.link)
    element.setInnerContent(newLink.content);
  }
}

const rewriter = new HTMLRewriter()
    .on('title', new TitleRewriter())
    .on('h1#title', new MainTitleRewriter())
    .on('p#description', new DescriptionRewriter())
    .on('a#url', new LinkRewriter());

// Constants
const newTitle = "Routeflare";
const prependMainTitle = "Routeflare: ";
const newLink = {
  link: 'https://github.com/jqwotos',
  content: 'Visit my Github!'
}
const variantURL = "https://cfw-takehome.developers.workers.dev/api/variants";