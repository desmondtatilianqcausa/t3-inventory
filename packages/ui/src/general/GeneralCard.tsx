import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@acme/ui/components/badge";
import { Button } from "@acme/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@acme/ui/components/card";
import { Skeleton } from "@acme/ui/components/skeleton";
import { cn } from "@acme/ui/lib/utils";

export type CardLayout = "stacked" | "inline" | "overlay";

export interface GeneralCardProps {
  title?: ReactNode;
  subtitle?: string;
  content?: ReactNode;
  image?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  layout?: CardLayout;
  hoverContent?: ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    icon?: ReactNode;
    color?: {
      background?: string;
      text?: string;
      border?: string;
    };
  };
  navigation?: {
    path: string;
    type?: "button" | "card";
    buttonText?: string;
    buttonVariant?: "default" | "secondary" | "outline" | "ghost";
    openInNewTab?: boolean;
  };
  className?: string;
  contentClassName?: string;
  onClick?: () => void;
  enableHoverEffects?: boolean;
}

export interface GeneralCardSkeletonProps {
  layout?: CardLayout;
  hasImage?: boolean;
  hasTitle?: boolean;
  hasSubtitle?: boolean;
  hasContent?: boolean;
  hasFooter?: boolean;
  className?: string;
  titleWidth?: string;
  subtitleWidth?: string;
  contentLines?: number;
}

// Skeleton component for loading states
export function GeneralCardSkeleton({
  layout = "stacked",
  hasImage = true,
  hasTitle = true,
  hasSubtitle = true,
  hasContent = true,
  hasFooter = true,
  className = "",
  titleWidth = "3/4",
  subtitleWidth = "1/2",
  contentLines = 2,
}: GeneralCardSkeletonProps) {
  const cardClasses = cn(
    "relative overflow-hidden",
    {
      "flex flex-col": layout === "stacked",
      "flex flex-row flex-wrap md:flex-nowrap": layout === "inline",
      "group relative overflow-hidden": layout === "overlay",
    },
    className,
  );

  if (layout === "inline") {
    return (
      <Card className={cardClasses}>
        {hasImage && (
          <div className="relative h-full w-[30%] min-w-[120px] overflow-hidden">
            <Skeleton className="absolute inset-0 h-full w-full" />
          </div>
        )}
        <CardContent className="flex flex-1 flex-col justify-center p-6">
          {hasTitle && <Skeleton className={`h-6 w-${titleWidth} mb-2`} />}
          {hasSubtitle && (
            <Skeleton className={`h-4 w-${subtitleWidth} mb-4`} />
          )}
          {hasContent && (
            <div className="space-y-2">
              {Array(contentLines)
                .fill(0)
                .map((_, i) => (
                  <Skeleton
                    key={i}
                    className={`h-4 w-${i === contentLines - 1 ? "3/5" : "full"}`}
                  />
                ))}
            </div>
          )}
          {hasFooter && <Skeleton className="mt-4 h-10 w-32" />}
        </CardContent>
      </Card>
    );
  }

  if (layout === "overlay") {
    return (
      <Card className={cn(cardClasses, "aspect-video")}>
        <Skeleton className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        <CardContent className="relative mt-auto p-6">
          {hasTitle && <Skeleton className={`h-6 w-${titleWidth} mb-2`} />}
          {hasSubtitle && (
            <Skeleton className={`h-4 w-${subtitleWidth} mb-4`} />
          )}
          {hasFooter && <Skeleton className="mt-4 h-10 w-32" />}
        </CardContent>
      </Card>
    );
  }

  // Stacked layout (default)
  return (
    <Card className={cardClasses}>
      {hasImage && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Skeleton className="absolute inset-0 h-full w-full" />
        </div>
      )}
      <CardContent className="p-6">
        {hasTitle && <Skeleton className={`h-6 w-${titleWidth} mb-2`} />}
        {hasSubtitle && <Skeleton className={`h-4 w-${subtitleWidth} mb-4`} />}
        {hasContent && (
          <div className="space-y-2">
            {Array(contentLines)
              .fill(0)
              .map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-4 w-${i === contentLines - 1 ? "3/5" : "full"}`}
                />
              ))}
          </div>
        )}
        {hasFooter && <Skeleton className="mt-4 h-10 w-full" />}
      </CardContent>
    </Card>
  );
}

export function GeneralCard({
  title,
  subtitle,
  content,
  image,
  layout = "stacked",
  hoverContent,
  badge,
  navigation,
  className,
  contentClassName,
  onClick,
  enableHoverEffects,
}: GeneralCardProps) {
  console.log("enableHoverEffects", enableHoverEffects);
  const CardWrapper = ({ children }: { children: ReactNode }) => {
    if (navigation?.type === "card") {
      return (
        <Link
          href={navigation.path}
          target={navigation.openInNewTab ? "_blank" : undefined}
          className="block"
        >
          {children}
        </Link>
      );
    }
    return <>{children}</>;
  };

  const NavigationButton = () => {
    if (navigation?.type === "button") {
      return (
        <Button
          variant={navigation.buttonVariant ?? "default"}
          onClick={(e) => {
            e.stopPropagation();
            if (navigation.openInNewTab) {
              window.open(navigation.path, "_blank");
            } else {
              window.location.href = navigation.path;
            }
          }}
          className="mt-4"
        >
          {navigation.buttonText ?? "Learn More"}
        </Button>
      );
    }
    return null;
  };

  const renderBadge = () => {
    if (!badge) return null;

    const badgePosition = {
      "top-left": "top-2 left-2",
      "top-right": "top-2 right-2",
      "bottom-left": "bottom-2 left-2",
      "bottom-right": "bottom-2 right-2",
    };

    const position = badge.position ?? "top-right";
    const style = badge.color
      ? {
          backgroundColor: badge.color.background,
          color: badge.color.text,
          borderColor: badge.color.border,
        }
      : {};

    return (
      <Badge
        variant={badge.variant ?? "default"}
        className={`absolute z-10 ${badgePosition[position]}`}
        style={style}
      >
        {badge.icon && <span className="mr-1">{badge.icon}</span>}
        {badge.text}
      </Badge>
    );
  };

  const cardClasses = cn(
    "relative p-0 transition-all",
    {
      "flex flex-col": layout === "stacked",
      "flex flex-row flex-wrap md:flex-nowrap": layout === "inline",
      "group relative overflow-hidden": layout === "overlay",
      "no-hover-effects": !enableHoverEffects,
    },
    className,
  );

  const getImageClasses = () => {
    const baseClasses = "h-full w-full object-cover";

    if (enableHoverEffects) {
      return `${baseClasses} transition-transform duration-300 group-hover:scale-105`;
    }

    return baseClasses;
  };

  if (layout === "inline") {
    return (
      <CardWrapper>
        <Card className={cardClasses} onClick={onClick}>
          {renderBadge()}
          <div className="grid h-full grid-cols-[2fr_3fr] gap-6">
            {image && (
              <div className="relative h-full overflow-hidden">
                <img
                  src={image.src}
                  alt={image.alt}
                  className={getImageClasses()}
                />
              </div>
            )}
            <CardContent className="flex flex-col justify-center p-6">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
              <div className="card-content">{content}</div>

              {navigation?.type === "button" && <NavigationButton />}
            </CardContent>
          </div>
        </Card>
      </CardWrapper>
    );
  }

  if (layout === "overlay") {
    const overlayClasses = cn(
      "absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-60",
      enableHoverEffects &&
        "transition-opacity duration-300 group-hover:opacity-80",
    );

    const contentWrapperClasses = cn(
      "transform",
      enableHoverEffects &&
        "transition-transform duration-300 group-hover:translate-y-0",
    );

    const hoverContentClasses = cn(
      "absolute inset-0 flex items-center justify-center opacity-0",
      enableHoverEffects &&
        "transition-opacity duration-300 group-hover:opacity-100",
    );

    return (
      <CardWrapper>
        <Card className={cn(cardClasses, "aspect-video")} onClick={onClick}>
          {renderBadge()}
          {image && (
            <img
              src={image.src}
              alt={image.alt}
              className={getImageClasses()}
            />
          )}
          <div className={overlayClasses} />
          <CardContent className="relative flex h-full flex-col justify-end p-6">
            <div className={contentWrapperClasses}>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
              <div className="text-white/90">{content}</div>
              {navigation?.type === "button" && <NavigationButton />}
            </div>
            {hoverContent && enableHoverEffects && (
              <div className={hoverContentClasses}>{hoverContent}</div>
            )}
          </CardContent>
        </Card>
      </CardWrapper>
    );
  }

  // Stacked layout (default)
  return (
    <CardWrapper>
      <Card className={cardClasses} onClick={onClick}>
        {renderBadge()}
        {image && (
          <div className="!sticky aspect-video w-full">
            <img
              src={image.src}
              alt={image.alt}
              className={getImageClasses()}
            />
          </div>
        )}
        <CardTitle>{title}</CardTitle>
        <CardContent className={cn("font-body p-", contentClassName)}>
          <CardDescription>{subtitle}</CardDescription>
          {content}

          {navigation?.type === "button" && <NavigationButton />}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
