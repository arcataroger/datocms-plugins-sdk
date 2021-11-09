import connectToParent from 'penpal/lib/connectToParent';
import { Field, ModelBlock } from './SiteApiSchema';
import {
  RenderPluginParametersFormMethods,
  RenderManualFieldExtensionParametersFormMethods,
  RenderSidebarPaneMethods,
  RenderModalMethods,
  SettingsPage,
  SettingsPageSection,
  ContentPage,
  FieldExtension,
  FieldExtensionOverride,
  MainNavigationPage,
  SidebarPane,
  RenderFieldExtensionMethods,
  RenderPageMethods,
} from './types';

import {
  InitMetaAndMethods,
  isInitParent,
  isRenderPluginParametersFormParent,
  isRenderManualFieldExtensionParametersFormParent,
  isRenderFieldExtensionParent,
  isRenderModalParent,
  isRenderPageParent,
  isRenderSidebarPaneParent,
  Parent,
  RenderPluginParametersFormMetaAndMethods,
  RenderManualFieldExtensionParametersFormMetaAndMethods,
  RenderFieldExtensionMetaAndMethods,
  RenderModalMetaAndMethods,
  RenderPageMetaAndMethods,
  RenderSidebarPaneMetaAndMethods,
} from './parentTypes';

type SizingUtilities = {
  startAutoResizer: () => void;
  stopAutoResizer: () => void;
  updateHeight: (newHeight?: number) => void;
};

export type { Field, ModelBlock };

export type InitCtx = InitMetaAndMethods;
export type FieldInitCtx = InitMetaAndMethods & { itemType: ModelBlock };
export type RenderPageCtx = RenderPageMetaAndMethods;
export type RenderModalCtx = RenderModalMetaAndMethods & SizingUtilities;
export type RenderSidebarPaneCtx = RenderSidebarPaneMetaAndMethods & SizingUtilities;
export type RenderFieldExtensionCtx = RenderFieldExtensionMetaAndMethods & SizingUtilities;
export type RenderManualFieldExtensionParametersFormCtx = RenderManualFieldExtensionParametersFormMetaAndMethods &
  SizingUtilities;
export type RenderPluginParametersFormCtx = RenderPluginParametersFormMetaAndMethods &
  SizingUtilities;

type FullPluginParameters = {
  mainNavigationPages: (ctx: InitCtx) => MainNavigationPage[];
  settingsPageSections: (ctx: InitCtx) => SettingsPageSection[];
  settingsPages: (ctx: InitCtx) => SettingsPage[];
  contentPages: (ctx: InitCtx) => ContentPage[];
  manualFieldExtensions: (ctx: InitCtx) => FieldExtension[];
  itemTypeSidebarPanes: (itemType: ModelBlock, ctx: InitCtx) => SidebarPane[];
  overrideFieldExtensions: (field: Field, ctx: FieldInitCtx) => FieldExtensionOverride | void;
  renderPluginParametersForm: (ctx: RenderPluginParametersFormCtx) => void;
  renderPage: (pageId: string, ctx: RenderPageCtx) => void;
  renderModal: (modalId: string, ctx: RenderModalCtx) => void;
  renderSidebarPane: (sidebarPaneId: string, ctx: RenderSidebarPaneCtx) => void;
  renderFieldExtension: (fieldExtensionId: string, ctx: RenderFieldExtensionCtx) => void;
  renderManualFieldExtensionParametersForm: (
    fieldExtensionId: string,
    ctx: RenderManualFieldExtensionParametersFormCtx,
  ) => void;
  validateManualFieldExtensionParameters: (
    fieldExtensionId: string,
    parameters: Record<string, unknown>,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
};

function toMultifield<Result>(fn: ((field: Field, ctx: FieldInitCtx) => Result) | undefined) {
  return (fields: Field[], ctx: InitMetaAndMethods): Record<string, Result> => {
    if (!fn) {
      return {};
    }

    const result: Record<string, Result> = {};

    for (const field of fields) {
      const itemType = ctx.itemTypes[field.relationships.item_type.data.id] as ModelBlock;
      result[field.id] = fn(field, { ...ctx, itemType });
    }

    return result;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any) => infer U
  ? U
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any;

const buildRenderUtils = (parent: { setHeight: (number: number) => void }) => {
  let oldHeight: null | number = null;

  const updateHeight = (height?: number) => {
    const realHeight =
      height === undefined
        ? Math.ceil(document.documentElement.getBoundingClientRect().height)
        : height;

    if (realHeight !== oldHeight) {
      parent.setHeight(realHeight);
      oldHeight = realHeight;
    }
  };

  let autoResizingActive = false;
  let mutationObserver: MutationObserver | null = null;

  const resetHeight = () => updateHeight();

  const startAutoResizer = () => {
    updateHeight();

    if (autoResizingActive) {
      return;
    }

    autoResizingActive = true;

    mutationObserver = new MutationObserver(resetHeight);

    mutationObserver.observe(window.document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener('resize', resetHeight);
  };

  const stopAutoResizer = () => {
    if (!autoResizingActive) {
      return;
    }

    autoResizingActive = false;

    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    window.removeEventListener('resize', resetHeight);
  };

  return { updateHeight, startAutoResizer, stopAutoResizer };
};

export async function connect(configuration: Partial<FullPluginParameters> = {}): Promise<void> {
  const {
    mainNavigationPages,
    settingsPageSections,
    settingsPages,
    contentPages,
    manualFieldExtensions,
    itemTypeSidebarPanes,
  } = configuration;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listener: ((newSettings: any) => void) | null = null;

  const penpalConnection = connectToParent({
    methods: {
      sdkVersion: () => '0.2.0',
      mainNavigationPages,
      settingsPageSections,
      settingsPages,
      contentPages,
      manualFieldExtensions,
      itemTypeSidebarPanes,
      overrideFieldExtensions: toMultifield(configuration.overrideFieldExtensions),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange(newSettings: any) {
        if (listener) {
          listener(newSettings);
        }
      },
      validateManualFieldExtensionParameters: configuration.validateManualFieldExtensionParameters,
    },
  });

  const parent: Parent = await penpalConnection.promise;
  const initialSettings = await parent.getSettings();

  if (isInitParent(parent, initialSettings)) {
    // Nothing to do. Parent calls the method they need.
  }

  if (isRenderPageParent(parent, initialSettings)) {
    type Settings = AsyncReturnType<RenderPageMethods['getSettings']>;

    const render = (settings: Settings) => {
      if (!configuration.renderPage) {
        return;
      }

      configuration.renderPage(settings.pageId, {
        ...parent,
        ...settings,
      });
    };

    listener = render;
    render(initialSettings as Settings);
  }

  if (isRenderPluginParametersFormParent(parent, initialSettings)) {
    type Settings = AsyncReturnType<RenderPluginParametersFormMethods['getSettings']>;

    const renderUtils = buildRenderUtils(parent);

    const render = (settings: Settings) => {
      if (!configuration.renderPluginParametersForm) {
        return;
      }

      configuration.renderPluginParametersForm({
        ...parent,
        ...settings,
        ...renderUtils,
      });
    };

    listener = render;
    render(initialSettings as Settings);
  }

  if (isRenderModalParent(parent, initialSettings)) {
    type Settings = AsyncReturnType<RenderModalMethods['getSettings']>;

    const renderUtils = buildRenderUtils(parent);

    const render = (settings: Settings) => {
      if (!configuration.renderModal) {
        return;
      }

      configuration.renderModal(settings.modalId, {
        ...parent,
        ...settings,
        ...renderUtils,
      });
    };

    listener = render;
    render(initialSettings as Settings);
  }

  if (isRenderSidebarPaneParent(parent, initialSettings)) {
    type Settings = AsyncReturnType<RenderSidebarPaneMethods['getSettings']>;

    const renderUtils = buildRenderUtils(parent);

    const render = (settings: Settings) => {
      if (!configuration.renderSidebarPane) {
        return;
      }

      configuration.renderSidebarPane(settings.sidebarPaneId, {
        ...parent,
        ...settings,
        ...renderUtils,
      });
    };

    listener = render;
    render(initialSettings as Settings);
  }

  if (isRenderFieldExtensionParent(parent, initialSettings)) {
    type Settings = AsyncReturnType<RenderFieldExtensionMethods['getSettings']>;

    const renderUtils = buildRenderUtils(parent);

    const render = (settings: Settings) => {
      if (!configuration.renderFieldExtension) {
        return;
      }

      configuration.renderFieldExtension(settings.fieldExtensionId, {
        ...parent,
        ...settings,
        ...renderUtils,
      });
    };

    listener = render;
    render(initialSettings as Settings);
  }

  if (isRenderManualFieldExtensionParametersFormParent(parent, initialSettings)) {
    type Settings = AsyncReturnType<RenderManualFieldExtensionParametersFormMethods['getSettings']>;

    const renderUtils = buildRenderUtils(parent);

    const render = (settings: Settings) => {
      if (!configuration.renderManualFieldExtensionParametersForm) {
        return;
      }

      configuration.renderManualFieldExtensionParametersForm(settings.fieldExtensionId, {
        ...parent,
        ...settings,
        ...renderUtils,
      });
    };

    listener = render;
    render(initialSettings as Settings);
  }
}
