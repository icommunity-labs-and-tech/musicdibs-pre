# Project architecture

- Generate crawler-readable homepage content at postbuild from the same locale JSON used by React, while retaining the existing LCP shell and `createRoot`; production builds cannot depend on a browser and must not hydrate an unrelated static tree.
- Keep public testimonial videos in one shared catalogue and link their original sources; there are no verified written quotations to attribute to registered users.