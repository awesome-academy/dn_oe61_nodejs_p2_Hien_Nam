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
export const INCLUDE_ORDER_SUMMARY_RESPONSE = {
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
  payments: {
    select: {
      id: true,
      amount: true,
      status: true,
      paymentType: true,
      createdAt: true,
    },
  },
};
