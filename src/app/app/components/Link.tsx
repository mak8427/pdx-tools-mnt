import { cva, cx } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Link as LinkPrimitive } from "react-router";
import React from "react";
import type { ComponentPropsWithoutRef } from "react";

const linkVariants = cva("underline-offset-4 hover:underline", {
  variants: {
    variant: {
      light: "font-semibold text-sky-300 hover:text-sky-200",
      dark: "font-semibold text-sky-600 hover:text-sky-700",
      standard:
        "font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-500",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "standard",
  },
});

export const Link = React.forwardRef<
  HTMLAnchorElement,
  Omit<ComponentPropsWithoutRef<typeof LinkPrimitive>, "to"> &
    VariantProps<typeof linkVariants> &
    ({ href: string } | { to: ComponentPropsWithoutRef<typeof LinkPrimitive>["to"] })
>(function Link({ className, variant, children, ...props }, ref) {
  if (import.meta.env.VITE_STATIC_VIEWER) {
    const path = "href" in props ? props.href : props.to;
    if (typeof path === "string" && path.startsWith("/") && path !== "/") {
      const { to: _to, ...rest } = props as ComponentPropsWithoutRef<typeof LinkPrimitive>;
      return (
        <a
          {...rest}
          href={`https://pdx.tools${path}`}
          ref={ref}
          className={cx(linkVariants({ variant }), className)}
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      );
    }
    if ("href" in props && props.href === "/") props = { ...props, href: import.meta.env.BASE_URL };
  }
  if ("href" in props) {
    const isExternal = props.href.toString().startsWith("http");
    return (
      <a
        className={cx(linkVariants({ variant }), className)}
        ref={ref}
        {...props}
        target={props.target ?? (isExternal ? "_blank" : undefined)}
        rel={props.rel ?? (isExternal ? "noreferrer" : undefined)}
      >
        {children}
      </a>
    );
  } else {
    return (
      <LinkPrimitive className={cx(linkVariants({ variant }), className)} ref={ref} {...props}>
        {children}
      </LinkPrimitive>
    );
  }
});
