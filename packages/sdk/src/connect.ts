import connectToParent from 'penpal/lib/connectToParent';
import { Field, ModelBlock } from './SiteApiSchema';
import {
  RenderPluginParametersFormMethods,
  RenderManualFieldExtensionParametersFormMethods,
  RenderSidebarPaneMethods,
  RenderModalMethods,
  SettingsAreaSidebarItemGroup,
  ContentAreaSidebarItem,
  FieldExtension,
  FieldExtensionOverride,
  MainNavigationTab,
  SidebarPanel,
  RenderFieldExtensionMethods,
  RenderPageMethods,
  RenderPluginParametersFormPropertiesAndMethods,
  RenderManualFieldExtensionParametersFormPropertiesAndMethods,
  RenderFieldExtensionPropertiesAndMethods,
  RenderModalPropertiesAndMethods,
  RenderPagePropertiesAndMethods,
  RenderSidebarPanePropertiesAndMethods,
  InitPropertiesAndMethods,
} from './types';

import {
  isInitParent,
  isRenderPluginParametersFormParent,
  isRenderManualFieldExtensionParametersFormParent,
  isRenderFieldExtensionParent,
  isRenderModalParent,
  isRenderPageParent,
  isRenderSidebarPaneParent,
  Parent,
} from './guards';

export type SizingUtilities = {
  /** Listens for DOM changes and automatically calls `setHeight` when it detects a change */
  startAutoResizer: () => void;
  /** Stops resizing the iframe automatically */
  stopAutoResizer: () => void;
  /**
   * Triggers a change in the size of the iframe. If you don't explicitely pass
   * a `newHeight` it will be automatically calculated using the iframe content
   * at the moment
   */
  updateHeight: (newHeight?: number) => void;
};

export type { Field, ModelBlock };

export type InitCtx = InitPropertiesAndMethods;
export type FieldInitCtx = InitPropertiesAndMethods & { itemType: ModelBlock };
export type RenderPageCtx = RenderPagePropertiesAndMethods;
export type RenderModalCtx = RenderModalPropertiesAndMethods & SizingUtilities;
export type RenderSidebarPaneCtx = RenderSidebarPanePropertiesAndMethods &
  SizingUtilities;
export type RenderFieldExtensionCtx = RenderFieldExtensionPropertiesAndMethods &
  SizingUtilities;
export type RenderManualFieldExtensionParametersFormCtx = RenderManualFieldExtensionParametersFormPropertiesAndMethods &
  SizingUtilities;
export type RenderPluginParametersFormCtx = RenderPluginParametersFormPropertiesAndMethods &
  SizingUtilities;

/** The full options you can pass to the `connect` function */
export type FullConnectParameters = {
  /**
   * Use this function to declare new tabs you want to add in the top-bar of the UI
   *
   * @group pages
   */
  mainNavigationTabs: (ctx: InitCtx) => MainNavigationTab[];
  /**
   * Use this function to declare new navigation sections in the Settings Area sidebar
   *
   * @group pages
   */
  settingsAreaSidebarItemGroups: (
    ctx: InitCtx,
  ) => SettingsAreaSidebarItemGroup[];
  /**
   * Use this function to declare new navigation items in the Content Area sidebar
   *
   * @group pages
   */
  contentAreaSidebarItems: (ctx: InitCtx) => ContentAreaSidebarItem[];
  /**
   * Use this function to declare new field extensions that users will be able
   * to install manually in some field
   *
   * @group manualFieldExtensions
   */
  manualFieldExtensions: (ctx: InitCtx) => FieldExtension[];
  /**
   * Use this function to declare new sidebar panels to be shown when the user
   * edits records of a particular model
   *
   * @group sidebarPanels
   */
  itemTypeSidebarPanels: (itemType: ModelBlock, ctx: InitCtx) => SidebarPanel[];
  /**
   * Use this function to automatically force one or more field extensions to a
   * particular field
   *
   * @group forcedFieldExtensions
   */
  overrideFieldExtensions: (
    field: Field,
    ctx: FieldInitCtx,
  ) => FieldExtensionOverride | void;
  /**
   * This function will be called when the plugin needs to render the plugin's
   * configuration form
   *
   * @group plugin
   */
  renderPluginParametersForm: (ctx: RenderPluginParametersFormCtx) => void;
  /**
   * This function will be called when the plugin needs to render a specific
   * page (see the `mainNavigationTabs`, `settingsAreaSidebarItemGroups` and
   * `contentAreaSidebarItems` functions)
   *
   * @group pages
   */
  renderPage: (pageId: string, ctx: RenderPageCtx) => void;
  /**
   * This function will be called when the plugin requested to open a modal (see
   * the `openModal` function)
   *
   * @group modals
   */
  renderModal: (modalId: string, ctx: RenderModalCtx) => void;
  /**
   * This function will be called when the plugin needs to render a sidebar
   * panel (see the `itemTypeSidebarPanels` function)
   *
   * @group sidebarPanels
   */
  renderSidebarPanel: (
    sidebarPaneId: string,
    ctx: RenderSidebarPaneCtx,
  ) => void;
  /**
   * This function will be called when the plugin needs to render a field
   * extension (see the `manualFieldExtensions` and `overrideFieldExtensions` functions)
   *
   * @group manualFieldExtensions, forcedFieldExtensions
   */
  renderFieldExtension: (
    fieldExtensionId: string,
    ctx: RenderFieldExtensionCtx,
  ) => void;
  /**
   * This function will be called when the plugin needs to render the
   * configuration form for installing a field extension inside a particular field
   *
   * @group manualFieldExtensions
   */
  renderManualFieldExtensionParametersForm: (
    fieldExtensionId: string,
    ctx: RenderManualFieldExtensionParametersFormCtx,
  ) => void;
  /**
   * This function will be called each time the configuration object changes. It
   * must return an object containing possible validation errors
   *
   * @group manualFieldExtensions
   */
  validateManualFieldExtensionParameters: (
    fieldExtensionId: string,
    parameters: Record<string, unknown>,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
};

function toMultifield<Result>(
  fn: ((field: Field, ctx: FieldInitCtx) => Result) | undefined,
) {
  return (
    fields: Field[],
    ctx: InitPropertiesAndMethods,
  ): Record<string, Result> => {
    if (!fn) {
      return {};
    }

    const result: Record<string, Result> = {};

    for (const field of fields) {
      const itemType = ctx.itemTypes[
        field.relationships.item_type.data.id
      ] as ModelBlock;
      result[field.id] = fn(field, { ...ctx, itemType });
    }

    return result;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => Promise<infer U>
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

export async function connect(
  configuration: Partial<FullConnectParameters> = {},
): Promise<void> {
  const {
    mainNavigationTabs,
    settingsAreaSidebarItemGroups,
    contentAreaSidebarItems,
    manualFieldExtensions,
    itemTypeSidebarPanels,
  } = configuration;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listener: ((newSettings: any) => void) | null = null;

  const penpalConnection = connectToParent({
    methods: {
      sdkVersion: () => '0.2.0',
      mainNavigationTabs,
      settingsAreaSidebarItemGroups,
      contentAreaSidebarItems,
      manualFieldExtensions,
      itemTypeSidebarPanels,
      overrideFieldExtensions: toMultifield(
        configuration.overrideFieldExtensions,
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange(newSettings: any) {
        if (listener) {
          listener(newSettings);
        }
      },
      validateManualFieldExtensionParameters:
        configuration.validateManualFieldExtensionParameters,
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
    type Settings = AsyncReturnType<
      RenderPluginParametersFormMethods['getSettings']
    >;

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
      if (!configuration.renderSidebarPanel) {
        return;
      }

      configuration.renderSidebarPanel(settings.sidebarPaneId, {
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

  if (
    isRenderManualFieldExtensionParametersFormParent(parent, initialSettings)
  ) {
    type Settings = AsyncReturnType<
      RenderManualFieldExtensionParametersFormMethods['getSettings']
    >;

    const renderUtils = buildRenderUtils(parent);

    const render = (settings: Settings) => {
      if (!configuration.renderManualFieldExtensionParametersForm) {
        return;
      }

      configuration.renderManualFieldExtensionParametersForm(
        settings.fieldExtensionId,
        {
          ...parent,
          ...settings,
          ...renderUtils,
        },
      );
    };

    listener = render;
    render(initialSettings as Settings);
  }
}
