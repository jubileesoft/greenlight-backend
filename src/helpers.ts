/* eslint-disable @typescript-eslint/no-explicit-any */
const returnOnError = (operation: () => any, alternative: any): any => {
  try {
    return operation();
  } catch (e) {
    return alternative;
  }
};

export { returnOnError };
