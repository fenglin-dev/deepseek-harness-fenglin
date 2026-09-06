# Agent Note: Give the macOS tray a dedicated template icon

Status: implemented

English | [中文](2026-08-20-macos-tray-template-icon.zh.md)

## Problem

The desktop host resized the full 1024-pixel application icon and marked it as a macOS template image. Because the rounded-square background is opaque, macOS converted the entire tile into one solid menu-bar color, which appeared as a plain white button instead of the application mark.

## Decision

The macOS default uses a dedicated white-and-alpha `tray-iconTemplate.png` derived from the [approved transparent master](../../../../apps/desktop/assets/tray-icon/approved-white-transparent.png). The [black-on-white approval image](../../../../apps/desktop/assets/tray-icon/approved-black-on-white.png) is retained alongside it. The rider, whale, eye and outward-convex lower-jaw outline keep their approved geometry; the mouth and spaces between the figures remain transparent. The alpha bounds at `(167, 366, 1012, 576)` remove only external whitespace. Proportional fitting into a 28-by-16 region plus one-pixel transparent margins produces a horizontal 30-by-18 image; the Retina representation doubles every dimension. Template mode lets macOS recolor the alpha silhouette for the menu bar, independently of its white source pixels. Windows and Linux default to the full-color application icon.

## Alternatives considered

**Continue resizing the full application icon.** Its opaque rounded-square tile becomes a solid template silhouette and cannot produce a recognizable menu-bar mark.

**Fit the full square approval canvas into the menu bar.** Its external whitespace makes the mark too small. Cropping only that whitespace preserves the approved artwork without redrawing or squeezing its horizontal proportions.

## Verification

The desktop asset build copies both template PNG densities without renaming them. The base asset is 30 by 18 RGBA at 72 dpi; the Retina asset is 60 by 36 RGBA at 144 dpi. The native icon smoke checks the retained rider, hollow mouth and lower-jaw outline, transparent margins, white source pixels, both loaded scale factors, and byte equality between source and built assets. Desktop typechecking and the desktop build verify the consuming path.

## Consequences

The default menu-bar icon follows light and dark system appearances and remains recognizable at native status-bar size. [Custom desktop icons](../feature/2026-09-02-custom-desktop-icons.md) can override the running Dock, window, and tray; custom tray images retain color instead of becoming templates. Notifications and installers retain the built-in full-color icon.
