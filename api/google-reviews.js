/**
 * Google reviews for the Global Beyond LLC site.
 *
 * Reads the business profile's reviews from the Google Places API and hands
 * the browser a trimmed version. The API key never reaches the browser: it
 * stays in the environment and only this function sees it, which is also why
 * the page can fetch this without loosening the site's connect-src 'self'.
 *
 * Environment variables (set in the Vercel project):
 *   GOOGLE_PLACES_API_KEY  Key from a Google Cloud project with Places API (New) enabled
 *   GOOGLE_PLACE_ID        Place ID of the business profile
 *
 * With either missing this answers with an empty list rather than an error,
 * so the reviews page keeps working — it simply shows the site's own reviews.
 */

const LANGS = ['en', 'es'];
const MAX_TEXT = 900;

const pickLang = (value) => (LANGS.indexOf(String(value)) !== -1 ? String(value) : 'en');

/* Google returns at most five, but cap anyway so a change upstream can't
   flood the page. */
const MAX_REVIEWS = 6;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ reviews: [] });
  }

  const empty = (reason) => {
    if (reason) console.error('google-reviews:', reason);
    /* Short cache even when empty, so a missing key doesn't mean a request to
       this function on every single page view. */
    res.setHeader('Cache-Control', 's-maxage=600');
    return res.status(200).json({ reviews: [] });
  };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return empty(null);

  const lang = pickLang(req.query && req.query.lang);

  try {
    const url =
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
      `?languageCode=${encodeURIComponent(lang)}`;

    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
      },
    });

    if (!response.ok) {
      return empty(`places responded ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    const reviews = (Array.isArray(data.reviews) ? data.reviews : [])
      .map((review) => {
        const author = review.authorAttribution || {};
        const text = (review.text && review.text.text) || (review.originalText && review.originalText.text) || '';
        return {
          author: typeof author.displayName === 'string' ? author.displayName.slice(0, 120) : '',
          rating: typeof review.rating === 'number' ? review.rating : 0,
          text: typeof text === 'string' ? text.trim().slice(0, MAX_TEXT) : '',
          date: typeof review.relativePublishTimeDescription === 'string' ? review.relativePublishTimeDescription : '',
          /* Straight to the review on Google where available, the profile
             otherwise — Google asks that their reviews link back. */
          url: review.googleMapsUri || data.googleMapsUri || '',
        };
      })
      .filter((review) => review.author && review.text)
      .slice(0, MAX_REVIEWS);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      rating: typeof data.rating === 'number' ? data.rating : null,
      total: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
      profileUrl: data.googleMapsUri || '',
      reviews,
    });
  } catch (error) {
    return empty(error);
  }
};
