export const INCLUDE_ORDER_RESPONSE = {
  items: {
    include: {
      productVariant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          size: {
            select: {
              nameSize: true,
            },
          },
        },
      },
    },
  },
};
