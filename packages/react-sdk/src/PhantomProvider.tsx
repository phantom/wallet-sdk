import * as React from "react";

const PhantomContext = React.createContext<undefined>(undefined);

export const PhantomProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <PhantomContext.Provider value={undefined}>
      {children}
    </PhantomContext.Provider>
  );
};
