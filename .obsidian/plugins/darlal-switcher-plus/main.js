'use strict';

var obsidian = require('obsidian');
var electron = require('electron');

var PathDisplayFormat;
(function (PathDisplayFormat) {
    PathDisplayFormat[PathDisplayFormat["None"] = 0] = "None";
    PathDisplayFormat[PathDisplayFormat["Full"] = 1] = "Full";
    PathDisplayFormat[PathDisplayFormat["FolderOnly"] = 2] = "FolderOnly";
    PathDisplayFormat[PathDisplayFormat["FolderWithFilename"] = 3] = "FolderWithFilename";
    PathDisplayFormat[PathDisplayFormat["FolderPathFilenameOptional"] = 4] = "FolderPathFilenameOptional";
})(PathDisplayFormat || (PathDisplayFormat = {}));
var Mode;
(function (Mode) {
    Mode[Mode["Standard"] = 1] = "Standard";
    Mode[Mode["EditorList"] = 2] = "EditorList";
    Mode[Mode["SymbolList"] = 4] = "SymbolList";
    Mode[Mode["WorkspaceList"] = 8] = "WorkspaceList";
    Mode[Mode["HeadingsList"] = 16] = "HeadingsList";
    Mode[Mode["BookmarksList"] = 32] = "BookmarksList";
    Mode[Mode["CommandList"] = 64] = "CommandList";
    Mode[Mode["RelatedItemsList"] = 128] = "RelatedItemsList";
    Mode[Mode["VaultList"] = 256] = "VaultList";
})(Mode || (Mode = {}));
var SymbolType;
(function (SymbolType) {
    SymbolType[SymbolType["Link"] = 1] = "Link";
    SymbolType[SymbolType["Embed"] = 2] = "Embed";
    SymbolType[SymbolType["Tag"] = 4] = "Tag";
    SymbolType[SymbolType["Heading"] = 8] = "Heading";
    SymbolType[SymbolType["Callout"] = 16] = "Callout";
    SymbolType[SymbolType["CanvasNode"] = 32] = "CanvasNode";
})(SymbolType || (SymbolType = {}));
var LinkType;
(function (LinkType) {
    LinkType[LinkType["None"] = 0] = "None";
    LinkType[LinkType["Normal"] = 1] = "Normal";
    LinkType[LinkType["Heading"] = 2] = "Heading";
    LinkType[LinkType["Block"] = 4] = "Block";
})(LinkType || (LinkType = {}));
const SymbolIndicators = {};
SymbolIndicators[SymbolType.Link] = '🔗';
SymbolIndicators[SymbolType.Embed] = '!';
SymbolIndicators[SymbolType.Tag] = '#';
SymbolIndicators[SymbolType.Heading] = 'H';
const HeadingIndicators = {};
HeadingIndicators[1] = 'H₁';
HeadingIndicators[2] = 'H₂';
HeadingIndicators[3] = 'H₃';
HeadingIndicators[4] = 'H₄';
HeadingIndicators[5] = 'H₅';
HeadingIndicators[6] = 'H₆';
var SuggestionType;
(function (SuggestionType) {
    SuggestionType["EditorList"] = "editorList";
    SuggestionType["SymbolList"] = "symbolList";
    SuggestionType["WorkspaceList"] = "workspaceList";
    SuggestionType["HeadingsList"] = "headingsList";
    SuggestionType["Bookmark"] = "bookmark";
    SuggestionType["CommandList"] = "commandList";
    SuggestionType["RelatedItemsList"] = "relatedItemsList";
    SuggestionType["VaultList"] = "vaultList";
    SuggestionType["File"] = "file";
    SuggestionType["Alias"] = "alias";
    SuggestionType["Unresolved"] = "unresolved";
})(SuggestionType || (SuggestionType = {}));
var MatchType;
(function (MatchType) {
    MatchType[MatchType["None"] = 0] = "None";
    MatchType[MatchType["Primary"] = 1] = "Primary";
    MatchType[MatchType["Basename"] = 2] = "Basename";
    MatchType[MatchType["Path"] = 3] = "Path";
})(MatchType || (MatchType = {}));
var RelationType;
(function (RelationType) {
    RelationType["DiskLocation"] = "disk-location";
    RelationType["Backlink"] = "backlink";
    RelationType["OutgoingLink"] = "outgoing-link";
})(RelationType || (RelationType = {}));

function isOfType(obj, discriminator, val) {
    let ret = false;
    if (obj && obj[discriminator] !== undefined) {
        ret = true;
        if (val !== undefined && val !== obj[discriminator]) {
            ret = false;
        }
    }
    return ret;
}
function isSymbolSuggestion(obj) {
    return isOfType(obj, 'type', SuggestionType.SymbolList);
}
function isEditorSuggestion(obj) {
    return isOfType(obj, 'type', SuggestionType.EditorList);
}
function isHeadingSuggestion(obj) {
    return isOfType(obj, 'type', SuggestionType.HeadingsList);
}
function isFileSuggestion(obj) {
    return isOfType(obj, 'type', SuggestionType.File);
}
function isAliasSuggestion(obj) {
    return isOfType(obj, 'type', SuggestionType.Alias);
}
function isUnresolvedSuggestion(obj) {
    return isOfType(obj, 'type', SuggestionType.Unresolved);
}
function isSystemSuggestion(obj) {
    return isFileSuggestion(obj) || isUnresolvedSuggestion(obj) || isAliasSuggestion(obj);
}
function isExSuggestion(sugg) {
    return sugg && !isSystemSuggestion(sugg);
}
function isHeadingCache(obj) {
    return isOfType(obj, 'level');
}
function isTagCache(obj) {
    return isOfType(obj, 'tag');
}
function isCalloutCache(obj) {
    return isOfType(obj, 'type', 'callout');
}
function isTFile(obj) {
    return isOfType(obj, 'extension');
}
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function getInternalPluginById(app, id) {
    return app?.internalPlugins?.getPluginById(id);
}
function getInternalEnabledPluginById(app, id) {
    return app?.internalPlugins?.getEnabledPluginById(id);
}
function getSystemSwitcherInstance(app) {
    const plugin = getInternalPluginById(app, 'switcher');
    return plugin?.instance;
}
/**
 * @returns Array The string names for all the available Modes.
 */
function getModeNames() {
    return Object.values(Mode)
        .filter((v) => isNaN(Number(v)))
        .sort();
}
function stripMDExtensionFromPath(file) {
    let retVal = null;
    if (file) {
        const { path } = file;
        retVal = path;
        if (file.extension === 'md') {
            const index = path.lastIndexOf('.');
            if (index !== -1 && index !== path.length - 1 && index !== 0) {
                retVal = path.slice(0, index);
            }
        }
    }
    return retVal;
}
function filenameFromPath(path) {
    let filename = null;
    if (path) {
        const normalizedPath = obsidian.normalizePath(path);
        const index = normalizedPath.lastIndexOf('/');
        filename = index === -1 ? normalizedPath : normalizedPath.slice(index + 1);
    }
    return filename;
}
function matcherFnForRegExList(regExStrings) {
    regExStrings = regExStrings ?? [];
    const regExList = [];
    for (const str of regExStrings) {
        try {
            const rx = new RegExp(str);
            regExList.push(rx);
        }
        catch (err) {
            console.log(`Switcher++: error creating RegExp from string: ${str}`, err);
        }
    }
    const isMatchFn = (input) => {
        for (const rx of regExList) {
            if (rx.test(input)) {
                return true;
            }
        }
        return false;
    };
    return isMatchFn;
}
function getLinkType(linkCache) {
    let type = LinkType.None;
    if (linkCache) {
        // remove the display text before trying to parse the link target
        const linkStr = linkCache.link.split('|')[0];
        if (linkStr.includes('#^')) {
            type = LinkType.Block;
        }
        else if (linkStr.includes('#')) {
            type = LinkType.Heading;
        }
        else {
            type = LinkType.Normal;
        }
    }
    return type;
}
/**
 * Retrieves a TFile object using path. Return null if path does not represent
 * a TFile object.
 * @param  {string} path
 * @param  {Vault} vault
 * @returns TFile
 */
function getTFileByPath(path, vault) {
    let file = null;
    const abstractItem = vault.getAbstractFileByPath(path);
    if (isTFile(abstractItem)) {
        file = abstractItem;
    }
    return file;
}
function generateMarkdownLink(fileManager, vault, sugg, sourcePath, options) {
    let linkStr = null;
    options = Object.assign({ useBasenameAsAlias: true, useHeadingAsAlias: true }, options);
    if (sugg) {
        let destFile = getDestinationFileForSuggestion(sugg);
        let alias = null;
        let subpath = null;
        switch (sugg.type) {
            case SuggestionType.Unresolved:
                linkStr = generateMarkdownLinkForUnresolved(sugg.linktext);
                break;
            case SuggestionType.Alias:
                alias = sugg.alias;
                break;
            case SuggestionType.Bookmark: {
                const { item } = sugg;
                if (item.type === 'file' && item.title) {
                    alias = item.title;
                }
                break;
            }
            case SuggestionType.HeadingsList: {
                const { heading } = sugg.item;
                ({ subpath, alias } = sanitizeStringForLinkSubpath(heading, options.useHeadingAsAlias));
                break;
            }
            case SuggestionType.SymbolList: {
                const { item: { symbol }, } = sugg;
                if (isHeadingCache(symbol)) {
                    ({ subpath, alias } = sanitizeStringForLinkSubpath(symbol.heading, options.useHeadingAsAlias));
                }
                else if (isOfType(symbol, 'link')) {
                    // Test if the link matches the external link format [text](url)
                    const isExternalLink = new RegExp(/^\[(.*?)\]\((.+?)\)/).test(symbol.original);
                    if (isExternalLink) {
                        linkStr = symbol.original;
                    }
                    else {
                        linkStr = generateMarkdownLinkForReferenceCache(fileManager, vault, sourcePath, symbol, destFile, options.useBasenameAsAlias);
                    }
                }
                else {
                    // Disable link generation for other symbol types by setting destFile to null
                    destFile = null;
                }
                break;
            }
            case SuggestionType.RelatedItemsList: {
                const { item } = sugg;
                if (item.unresolvedText) {
                    linkStr = generateMarkdownLinkForUnresolved(item.unresolvedText);
                }
                break;
            }
        }
        if (destFile && !linkStr) {
            // if an alias has be not identified use the filename as alias
            if (!alias && options.useBasenameAsAlias) {
                alias = destFile.basename;
            }
            linkStr = fileManager.generateMarkdownLink(destFile, sourcePath, subpath, alias);
        }
    }
    return linkStr;
}
function sanitizeStringForLinkSubpath(input, useInputAsAlias) {
    // May 2024: shamelessly borrowed from Obsidian
    const illegalLinkCharsRegex = /([:#|^\\\r\n]|%%|\[\[|]])/g;
    const sanitizedInput = input
        .replace(illegalLinkCharsRegex, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return {
        subpath: `#${sanitizedInput}`,
        alias: useInputAsAlias ? sanitizedInput : null,
    };
}
/**
 * Determines if sugg is a file-based suggestion, and if so, returns the associated
 * destination TFile. Otherwise returns null.
 * @param  {AnySuggestion} sugg
 * @returns TFile|null
 */
function getDestinationFileForSuggestion(sugg) {
    let destFile = null;
    const fileSuggTypes = [
        SuggestionType.Alias,
        SuggestionType.Bookmark,
        SuggestionType.HeadingsList,
        SuggestionType.SymbolList,
        SuggestionType.RelatedItemsList,
        SuggestionType.EditorList,
        SuggestionType.File,
    ];
    if (fileSuggTypes.includes(sugg.type)) {
        // for file based suggestions, get the destination file
        destFile = sugg.file;
    }
    return destFile;
}
function generateMarkdownLinkForUnresolved(path, displayText) {
    displayText = displayText?.length ? `|${displayText}` : '';
    return `[[${path}${displayText}]]`;
}
function generateMarkdownLinkForReferenceCache(fileManager, vault, sourcePath, refCache, refCacheSourceFile, useBasenameAsAlias) {
    const { link, displayText } = refCache;
    const { path, subpath } = obsidian.parseLinktext(link);
    let alias = displayText;
    let destFile = null;
    let linkStr = null;
    if (!path?.length) {
        // the path portion of the link is empty, meaning the destination path
        // is the file that contains the ReferenceCache
        destFile = refCacheSourceFile;
    }
    else {
        destFile = getTFileByPath(path, vault);
    }
    if (destFile) {
        if (!alias?.length && useBasenameAsAlias) {
            alias = destFile.basename;
        }
        linkStr = fileManager.generateMarkdownLink(destFile, sourcePath, subpath, alias);
    }
    else {
        linkStr = generateMarkdownLinkForUnresolved(path, alias);
    }
    return linkStr;
}

class FrontMatterParser {
    static getAliases(frontMatter) {
        let aliases = [];
        if (frontMatter) {
            aliases = FrontMatterParser.getValueForKey(frontMatter, /^alias(es)?$/i);
        }
        return aliases;
    }
    static getValueForKey(frontMatter, keyPattern) {
        const retVal = [];
        const fmKeys = Object.keys(frontMatter);
        const key = fmKeys.find((val) => keyPattern.test(val));
        if (key) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            let value = frontMatter[key];
            if (typeof value === 'string') {
                value = value.split(',');
            }
            if (Array.isArray(value)) {
                value.forEach((val) => {
                    if (typeof val === 'string') {
                        retVal.push(val.trim());
                    }
                });
            }
        }
        return retVal;
    }
}

// map Canvas node data types to facet id
const CANVAS_NODE_FACET_ID_MAP = {
    file: 'canvas-node-file',
    text: 'canvas-node-text',
    link: 'canvas-node-link',
    group: 'canvas-node-group',
};
const SYMBOL_MODE_FACETS = [
    {
        id: SymbolType[SymbolType.Heading],
        mode: Mode.SymbolList,
        label: 'headings',
        isActive: false,
        isAvailable: true,
    },
    {
        id: SymbolType[SymbolType.Tag],
        mode: Mode.SymbolList,
        label: 'tags',
        isActive: false,
        isAvailable: true,
    },
    {
        id: SymbolType[SymbolType.Callout],
        mode: Mode.SymbolList,
        label: 'callouts',
        isActive: false,
        isAvailable: true,
    },
    {
        id: SymbolType[SymbolType.Link],
        mode: Mode.SymbolList,
        label: 'links',
        isActive: false,
        isAvailable: true,
    },
    {
        id: SymbolType[SymbolType.Embed],
        mode: Mode.SymbolList,
        label: 'embeds',
        isActive: false,
        isAvailable: true,
    },
    {
        id: CANVAS_NODE_FACET_ID_MAP.file,
        mode: Mode.SymbolList,
        label: 'file cards',
        isActive: false,
        isAvailable: true,
    },
    {
        id: CANVAS_NODE_FACET_ID_MAP.text,
        mode: Mode.SymbolList,
        label: 'text cards',
        isActive: false,
        isAvailable: true,
    },
    {
        id: CANVAS_NODE_FACET_ID_MAP.link,
        mode: Mode.SymbolList,
        label: 'link cards',
        isActive: false,
        isAvailable: true,
    },
    {
        id: CANVAS_NODE_FACET_ID_MAP.group,
        mode: Mode.SymbolList,
        label: 'groups',
        isActive: false,
        isAvailable: true,
    },
];
const RELATED_ITEMS_MODE_FACETS = [
    {
        id: RelationType.Backlink,
        mode: Mode.RelatedItemsList,
        label: 'backlinks',
        isActive: false,
        isAvailable: true,
    },
    {
        id: RelationType.OutgoingLink,
        mode: Mode.RelatedItemsList,
        label: 'outgoing links',
        isActive: false,
        isAvailable: true,
    },
    {
        id: RelationType.DiskLocation,
        mode: Mode.RelatedItemsList,
        label: 'disk location',
        isActive: false,
        isAvailable: true,
    },
];
const BOOKMARKS_FACET_ID_MAP = {
    file: 'bookmarks-file',
    folder: 'bookmarks-folder',
    search: 'bookmarks-search',
    group: 'bookmarks-group',
};
const BOOKMARKS_MODE_FACETS = [
    {
        id: BOOKMARKS_FACET_ID_MAP.file,
        mode: Mode.BookmarksList,
        label: 'files',
        isActive: false,
        isAvailable: true,
    },
    {
        id: BOOKMARKS_FACET_ID_MAP.folder,
        mode: Mode.BookmarksList,
        label: 'folders',
        isActive: false,
        isAvailable: true,
    },
    {
        id: BOOKMARKS_FACET_ID_MAP.search,
        mode: Mode.BookmarksList,
        label: 'searches',
        isActive: false,
        isAvailable: true,
    },
];
var CommandListFacetIds;
(function (CommandListFacetIds) {
    CommandListFacetIds["Pinned"] = "pinnedCommands";
    CommandListFacetIds["Recent"] = "recentCommands";
})(CommandListFacetIds || (CommandListFacetIds = {}));
const COMMAND_MODE_FACETS = [
    {
        id: CommandListFacetIds.Pinned,
        mode: Mode.CommandList,
        label: 'pinned',
        isActive: false,
        isAvailable: true,
    },
    {
        id: CommandListFacetIds.Recent,
        mode: Mode.CommandList,
        label: 'recent',
        isActive: false,
        isAvailable: true,
    },
];
var HeadingsListFacetIds;
(function (HeadingsListFacetIds) {
    HeadingsListFacetIds["RecentFiles"] = "recentFilesSearch";
    HeadingsListFacetIds["Bookmarks"] = "bookmarksSearch";
    HeadingsListFacetIds["Filenames"] = "filenamesSearch";
    HeadingsListFacetIds["Headings"] = "headingsSearch";
    HeadingsListFacetIds["ExternalFiles"] = "externalFilesSearch";
})(HeadingsListFacetIds || (HeadingsListFacetIds = {}));
const HEADINGS_MODE_FACETS = [
    {
        id: HeadingsListFacetIds.RecentFiles,
        mode: Mode.HeadingsList,
        label: 'recent files',
        isActive: false,
        isAvailable: true,
    },
    {
        id: HeadingsListFacetIds.Bookmarks,
        mode: Mode.HeadingsList,
        label: 'bookmarks',
        isActive: false,
        isAvailable: true,
    },
    {
        id: HeadingsListFacetIds.Filenames,
        mode: Mode.HeadingsList,
        label: 'filenames',
        isActive: false,
        isAvailable: true,
    },
    {
        id: HeadingsListFacetIds.Headings,
        mode: Mode.HeadingsList,
        label: 'headings',
        isActive: false,
        isAvailable: true,
    },
    {
        id: HeadingsListFacetIds.ExternalFiles,
        mode: Mode.HeadingsList,
        label: 'external files',
        isActive: false,
        isAvailable: true,
    },
];
function getFacetMap() {
    const facetMap = {};
    const facetLists = [
        SYMBOL_MODE_FACETS,
        RELATED_ITEMS_MODE_FACETS,
        BOOKMARKS_MODE_FACETS,
        COMMAND_MODE_FACETS,
        HEADINGS_MODE_FACETS,
    ];
    facetLists.flat().reduce((facetMap, facet) => {
        facetMap[facet.id] = Object.assign({}, facet);
        return facetMap;
    }, facetMap);
    return facetMap;
}

// istanbul ignore next
const isObject = (obj) => {
    if (typeof obj === "object" && obj !== null) {
        if (typeof Object.getPrototypeOf === "function") {
            const prototype = Object.getPrototypeOf(obj);
            return prototype === Object.prototype || prototype === null;
        }
        return Object.prototype.toString.call(obj) === "[object Object]";
    }
    return false;
};
const merge = (...objects) => objects.reduce((result, current) => {
    if (Array.isArray(current)) {
        throw new TypeError("Arguments provided to ts-deepmerge must be objects, not arrays.");
    }
    Object.keys(current).forEach((key) => {
        if (["__proto__", "constructor", "prototype"].includes(key)) {
            return;
        }
        if (Array.isArray(result[key]) && Array.isArray(current[key])) {
            result[key] = merge.options.mergeArrays
                ? merge.options.uniqueArrayItems
                    ? Array.from(new Set(result[key].concat(current[key])))
                    : [...result[key], ...current[key]]
                : current[key];
        }
        else if (isObject(result[key]) && isObject(current[key])) {
            result[key] = merge(result[key], current[key]);
        }
        else {
            result[key] =
                current[key] === undefined
                    ? merge.options.allowUndefinedOverrides
                        ? current[key]
                        : result[key]
                    : current[key];
        }
    });
    return result;
}, {});
const defaultOptions = {
    allowUndefinedOverrides: true,
    mergeArrays: true,
    uniqueArrayItems: true,
};
merge.options = defaultOptions;
merge.withOptions = (options, ...objects) => {
    merge.options = Object.assign(Object.assign({}, defaultOptions), options);
    const result = merge(...objects);
    merge.options = defaultOptions;
    return result;
};

class SwitcherPlusSettings {
    static get defaults() {
        const enabledSymbolTypes = {};
        enabledSymbolTypes[SymbolType.Link] = true;
        enabledSymbolTypes[SymbolType.Embed] = true;
        enabledSymbolTypes[SymbolType.Tag] = true;
        enabledSymbolTypes[SymbolType.Heading] = true;
        enabledSymbolTypes[SymbolType.Callout] = true;
        return {
            version: '2.0.0',
            onOpenPreferNewTab: true,
            alwaysNewTabForSymbols: false,
            useActiveTabForSymbolsOnMobile: false,
            symbolsInLineOrder: true,
            editorListCommand: 'edt ',
            symbolListCommand: '@',
            symbolListActiveEditorCommand: '$ ',
            workspaceListCommand: '+',
            headingsListCommand: '#',
            bookmarksListCommand: "'",
            commandListCommand: '>',
            vaultListCommand: 'vault ',
            relatedItemsListCommand: '~',
            relatedItemsListActiveEditorCommand: '^ ',
            shouldSearchHeadings: true,
            strictHeadingsOnly: false,
            searchAllHeadings: true,
            headingsSearchDebounceMilli: 250,
            excludeViewTypes: ['empty'],
            referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
            limit: 50,
            includeSidePanelViewTypes: ['backlink', 'image', 'markdown', 'pdf'],
            enabledSymbolTypes,
            selectNearestHeading: true,
            excludeFolders: [],
            excludeLinkSubTypes: 0,
            excludeRelatedFolders: [''],
            excludeOpenRelatedFiles: false,
            excludeObsidianIgnoredFiles: false,
            shouldSearchFilenames: false,
            shouldSearchBookmarks: false,
            shouldSearchRecentFiles: true,
            pathDisplayFormat: PathDisplayFormat.FolderWithFilename,
            hidePathIfRoot: true,
            enabledRelatedItems: Object.values(RelationType),
            showOptionalIndicatorIcons: true,
            overrideStandardModeBehaviors: true,
            enabledRibbonCommands: [
                Mode[Mode.HeadingsList],
                Mode[Mode.SymbolList],
            ],
            fileExtAllowList: ['canvas'],
            matchPriorityAdjustments: {
                isEnabled: false,
                adjustments: {
                    isOpenInEditor: { value: 0, label: 'Open items' },
                    isBookmarked: { value: 0, label: 'Bookmarked items' },
                    isRecent: { value: 0, label: 'Recent items' },
                    isAttachment: { value: 0, label: 'Attachment file types' },
                    file: { value: 0, label: 'Filenames' },
                    alias: { value: 0, label: 'Aliases' },
                    unresolved: { value: 0, label: 'Unresolved filenames' },
                    h1: { value: 0, label: 'H₁ headings' },
                },
                fileExtAdjustments: {
                    canvas: { value: 0, label: 'Canvas files' },
                },
            },
            quickFilters: {
                resetKey: '0',
                keyList: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                modifiers: ['Ctrl', 'Alt'],
                facetList: getFacetMap(),
                shouldResetActiveFacets: false,
                shouldShowFacetInstructions: true,
            },
            preserveCommandPaletteLastInput: false,
            preserveQuickSwitcherLastInput: false,
            shouldCloseModalOnBackspace: false,
            maxRecentFileSuggestionsOnInit: 25,
            orderEditorListByAccessTime: true,
            insertLinkInEditor: {
                isEnabled: true,
                keymap: {
                    modifiers: ['Mod'],
                    key: 'i',
                    purpose: 'insert in editor',
                },
                insertableEditorTypes: ['markdown'],
                useBasenameAsAlias: true,
                useHeadingAsAlias: true,
            },
            removeDefaultTabBinding: true,
            navigationKeys: {
                nextKeys: [
                    { modifiers: ['Ctrl'], key: 'n' },
                    { modifiers: ['Ctrl'], key: 'j' },
                ],
                prevKeys: [
                    { modifiers: ['Ctrl'], key: 'p' },
                    { modifiers: ['Ctrl'], key: 'k' },
                ],
            },
            preferredSourceForTitle: 'H1',
            closeWhenEmptyKeys: [{ modifiers: null, key: 'Backspace' }],
            navigateToHotkeySelectorKeys: { modifiers: ['Ctrl', 'Shift'], key: 'h' },
            togglePinnedCommandKeys: { modifiers: ['Ctrl', 'Shift'], key: 'p' },
            escapeCmdChar: '!',
            mobileLauncher: {
                isEnabled: false,
                modeString: Mode[Mode.HeadingsList],
                iconName: '',
                coreLauncherButtonIconSelector: 'span.clickable-icon',
                coreLauncherButtonSelector: '.mobile-navbar-action:has(span.clickable-icon svg.svg-icon.lucide-plus-circle)',
            },
            allowCreateNewFileInModeNames: [
                Mode[Mode.Standard],
                Mode[Mode.HeadingsList],
            ],
            showModeTriggerInstructions: true,
        };
    }
    get version() {
        return this.data.version;
    }
    set version(value) {
        this.data.version = value;
    }
    get builtInSystemOptions() {
        return getSystemSwitcherInstance(this.plugin.app)?.options;
    }
    get showAllFileTypes() {
        // forward to core switcher settings
        return this.builtInSystemOptions?.showAllFileTypes;
    }
    get showAttachments() {
        // forward to core switcher settings
        return this.builtInSystemOptions?.showAttachments;
    }
    get showExistingOnly() {
        // forward to core switcher settings
        return this.builtInSystemOptions?.showExistingOnly;
    }
    get onOpenPreferNewTab() {
        return this.data.onOpenPreferNewTab;
    }
    set onOpenPreferNewTab(value) {
        this.data.onOpenPreferNewTab = value;
    }
    get alwaysNewTabForSymbols() {
        return this.data.alwaysNewTabForSymbols;
    }
    set alwaysNewTabForSymbols(value) {
        this.data.alwaysNewTabForSymbols = value;
    }
    get useActiveTabForSymbolsOnMobile() {
        return this.data.useActiveTabForSymbolsOnMobile;
    }
    set useActiveTabForSymbolsOnMobile(value) {
        this.data.useActiveTabForSymbolsOnMobile = value;
    }
    get symbolsInLineOrder() {
        return this.data.symbolsInLineOrder;
    }
    set symbolsInLineOrder(value) {
        this.data.symbolsInLineOrder = value;
    }
    get editorListPlaceholderText() {
        return SwitcherPlusSettings.defaults.editorListCommand;
    }
    get editorListCommand() {
        return this.data.editorListCommand;
    }
    set editorListCommand(value) {
        this.data.editorListCommand = value;
    }
    get symbolListPlaceholderText() {
        return SwitcherPlusSettings.defaults.symbolListCommand;
    }
    get symbolListCommand() {
        return this.data.symbolListCommand;
    }
    set symbolListCommand(value) {
        this.data.symbolListCommand = value;
    }
    get symbolListActiveEditorCommand() {
        return this.data.symbolListActiveEditorCommand;
    }
    set symbolListActiveEditorCommand(value) {
        this.data.symbolListActiveEditorCommand = value;
    }
    get workspaceListCommand() {
        return this.data.workspaceListCommand;
    }
    set workspaceListCommand(value) {
        this.data.workspaceListCommand = value;
    }
    get workspaceListPlaceholderText() {
        return SwitcherPlusSettings.defaults.workspaceListCommand;
    }
    get headingsListCommand() {
        return this.data.headingsListCommand;
    }
    set headingsListCommand(value) {
        this.data.headingsListCommand = value;
    }
    get headingsListPlaceholderText() {
        return SwitcherPlusSettings.defaults.headingsListCommand;
    }
    get bookmarksListCommand() {
        return this.data.bookmarksListCommand;
    }
    set bookmarksListCommand(value) {
        this.data.bookmarksListCommand = value;
    }
    get bookmarksListPlaceholderText() {
        return SwitcherPlusSettings.defaults.bookmarksListCommand;
    }
    get commandListCommand() {
        return this.data.commandListCommand;
    }
    set commandListCommand(value) {
        this.data.commandListCommand = value;
    }
    get commandListPlaceholderText() {
        return SwitcherPlusSettings.defaults.commandListCommand;
    }
    get vaultListCommand() {
        return this.data.vaultListCommand;
    }
    set vaultListCommand(value) {
        this.data.vaultListCommand = value;
    }
    get vaultListPlaceholderText() {
        return SwitcherPlusSettings.defaults.vaultListCommand;
    }
    get relatedItemsListCommand() {
        return this.data.relatedItemsListCommand;
    }
    set relatedItemsListCommand(value) {
        this.data.relatedItemsListCommand = value;
    }
    get relatedItemsListPlaceholderText() {
        return SwitcherPlusSettings.defaults.relatedItemsListCommand;
    }
    get relatedItemsListActiveEditorCommand() {
        return this.data.relatedItemsListActiveEditorCommand;
    }
    set relatedItemsListActiveEditorCommand(value) {
        this.data.relatedItemsListActiveEditorCommand = value;
    }
    get shouldSearchHeadings() {
        return this.data.shouldSearchHeadings;
    }
    set shouldSearchHeadings(value) {
        this.data.shouldSearchHeadings = value;
    }
    get strictHeadingsOnly() {
        return this.data.strictHeadingsOnly;
    }
    set strictHeadingsOnly(value) {
        this.data.strictHeadingsOnly = value;
    }
    get searchAllHeadings() {
        return this.data.searchAllHeadings;
    }
    set searchAllHeadings(value) {
        this.data.searchAllHeadings = value;
    }
    get headingsSearchDebounceMilli() {
        return this.data.headingsSearchDebounceMilli;
    }
    set headingsSearchDebounceMilli(value) {
        this.data.headingsSearchDebounceMilli = value;
    }
    get excludeViewTypes() {
        return this.data.excludeViewTypes;
    }
    set excludeViewTypes(value) {
        this.data.excludeViewTypes = value;
    }
    get referenceViews() {
        return this.data.referenceViews;
    }
    set referenceViews(value) {
        this.data.referenceViews = value;
    }
    get limit() {
        return this.data.limit;
    }
    set limit(value) {
        this.data.limit = value;
    }
    get includeSidePanelViewTypes() {
        return this.data.includeSidePanelViewTypes;
    }
    set includeSidePanelViewTypes(value) {
        // remove any duplicates before storing
        this.data.includeSidePanelViewTypes = [...new Set(value)];
    }
    get includeSidePanelViewTypesPlaceholder() {
        return SwitcherPlusSettings.defaults.includeSidePanelViewTypes.join('\n');
    }
    get selectNearestHeading() {
        return this.data.selectNearestHeading;
    }
    set selectNearestHeading(value) {
        this.data.selectNearestHeading = value;
    }
    get excludeFolders() {
        return this.data.excludeFolders;
    }
    set excludeFolders(value) {
        // remove any duplicates before storing
        this.data.excludeFolders = [...new Set(value)];
    }
    get excludeLinkSubTypes() {
        return this.data.excludeLinkSubTypes;
    }
    set excludeLinkSubTypes(value) {
        this.data.excludeLinkSubTypes = value;
    }
    get excludeRelatedFolders() {
        return this.data.excludeRelatedFolders;
    }
    set excludeRelatedFolders(value) {
        this.data.excludeRelatedFolders = [...new Set(value)];
    }
    get excludeOpenRelatedFiles() {
        return this.data.excludeOpenRelatedFiles;
    }
    set excludeOpenRelatedFiles(value) {
        this.data.excludeOpenRelatedFiles = value;
    }
    get excludeObsidianIgnoredFiles() {
        return this.data.excludeObsidianIgnoredFiles;
    }
    set excludeObsidianIgnoredFiles(value) {
        this.data.excludeObsidianIgnoredFiles = value;
    }
    get shouldSearchFilenames() {
        return this.data.shouldSearchFilenames;
    }
    set shouldSearchFilenames(value) {
        this.data.shouldSearchFilenames = value;
    }
    get shouldSearchBookmarks() {
        return this.data.shouldSearchBookmarks;
    }
    set shouldSearchBookmarks(value) {
        this.data.shouldSearchBookmarks = value;
    }
    get shouldSearchRecentFiles() {
        return this.data.shouldSearchRecentFiles;
    }
    set shouldSearchRecentFiles(value) {
        this.data.shouldSearchRecentFiles = value;
    }
    get pathDisplayFormat() {
        return this.data.pathDisplayFormat;
    }
    set pathDisplayFormat(value) {
        this.data.pathDisplayFormat = value;
    }
    get hidePathIfRoot() {
        return this.data.hidePathIfRoot;
    }
    set hidePathIfRoot(value) {
        this.data.hidePathIfRoot = value;
    }
    get enabledRelatedItems() {
        return this.data.enabledRelatedItems;
    }
    set enabledRelatedItems(value) {
        this.data.enabledRelatedItems = value;
    }
    get showOptionalIndicatorIcons() {
        return this.data.showOptionalIndicatorIcons;
    }
    set showOptionalIndicatorIcons(value) {
        this.data.showOptionalIndicatorIcons = value;
    }
    get overrideStandardModeBehaviors() {
        return this.data.overrideStandardModeBehaviors;
    }
    set overrideStandardModeBehaviors(value) {
        this.data.overrideStandardModeBehaviors = value;
    }
    get enabledRibbonCommands() {
        return this.data.enabledRibbonCommands;
    }
    set enabledRibbonCommands(value) {
        // remove any duplicates before storing
        this.data.enabledRibbonCommands = [...new Set(value)];
    }
    get fileExtAllowList() {
        return this.data.fileExtAllowList;
    }
    set fileExtAllowList(value) {
        this.data.fileExtAllowList = value;
    }
    get matchPriorityAdjustments() {
        return this.data.matchPriorityAdjustments;
    }
    set matchPriorityAdjustments(value) {
        this.data.matchPriorityAdjustments = value;
    }
    get quickFilters() {
        return this.data.quickFilters;
    }
    set quickFilters(value) {
        this.data.quickFilters = value;
    }
    get preserveCommandPaletteLastInput() {
        return this.data.preserveCommandPaletteLastInput;
    }
    set preserveCommandPaletteLastInput(value) {
        this.data.preserveCommandPaletteLastInput = value;
    }
    get preserveQuickSwitcherLastInput() {
        return this.data.preserveQuickSwitcherLastInput;
    }
    set preserveQuickSwitcherLastInput(value) {
        this.data.preserveQuickSwitcherLastInput = value;
    }
    get shouldCloseModalOnBackspace() {
        return this.data.shouldCloseModalOnBackspace;
    }
    set shouldCloseModalOnBackspace(value) {
        this.data.shouldCloseModalOnBackspace = value;
    }
    get maxRecentFileSuggestionsOnInit() {
        return this.data.maxRecentFileSuggestionsOnInit;
    }
    set maxRecentFileSuggestionsOnInit(value) {
        this.data.maxRecentFileSuggestionsOnInit = value;
    }
    get orderEditorListByAccessTime() {
        return this.data.orderEditorListByAccessTime;
    }
    set orderEditorListByAccessTime(value) {
        this.data.orderEditorListByAccessTime = value;
    }
    get insertLinkInEditor() {
        return this.data.insertLinkInEditor;
    }
    set insertLinkInEditor(value) {
        this.data.insertLinkInEditor = value;
    }
    get removeDefaultTabBinding() {
        return this.data.removeDefaultTabBinding;
    }
    set removeDefaultTabBinding(value) {
        this.data.removeDefaultTabBinding = value;
    }
    get navigationKeys() {
        return this.data.navigationKeys;
    }
    set navigationKeys(value) {
        this.data.navigationKeys = value;
    }
    get preferredSourceForTitle() {
        return this.data.preferredSourceForTitle;
    }
    set preferredSourceForTitle(value) {
        this.data.preferredSourceForTitle = value;
    }
    get closeWhenEmptyKeys() {
        return this.data.closeWhenEmptyKeys;
    }
    set closeWhenEmptyKeys(value) {
        this.data.closeWhenEmptyKeys = value;
    }
    get navigateToHotkeySelectorKeys() {
        return this.data.navigateToHotkeySelectorKeys;
    }
    set navigateToHotkeySelectorKeys(value) {
        this.data.navigateToHotkeySelectorKeys = value;
    }
    get togglePinnedCommandKeys() {
        return this.data.togglePinnedCommandKeys;
    }
    set togglePinnedCommandKeys(value) {
        this.data.togglePinnedCommandKeys = value;
    }
    get escapeCmdChar() {
        return this.data.escapeCmdChar;
    }
    set escapeCmdChar(value) {
        this.data.escapeCmdChar = value;
    }
    get mobileLauncher() {
        return this.data.mobileLauncher;
    }
    set mobileLauncher(value) {
        this.data.mobileLauncher = value;
    }
    get allowCreateNewFileInModeNames() {
        return this.data.allowCreateNewFileInModeNames;
    }
    set allowCreateNewFileInModeNames(value) {
        // remove any duplicates before storing
        this.data.allowCreateNewFileInModeNames = [...new Set(value)];
    }
    get showModeTriggerInstructions() {
        return this.data.showModeTriggerInstructions;
    }
    set showModeTriggerInstructions(value) {
        this.data.showModeTriggerInstructions = value;
    }
    constructor(plugin) {
        this.plugin = plugin;
        this.data = SwitcherPlusSettings.defaults;
    }
    async updateDataAndLoadSettings() {
        await SwitcherPlusSettings.transformDataFile(this.plugin, SwitcherPlusSettings.defaults);
        return await this.loadSettings();
    }
    async loadSettings() {
        const copy = (savedData, defaultData, keys) => {
            const keysToMerge = ['matchPriorityAdjustments', 'quickFilters'];
            const deepMerge = (key) => {
                return merge.withOptions({ mergeArrays: false }, defaultData[key], savedData[key]);
            };
            for (const key of keys) {
                if (key in savedData) {
                    defaultData[key] = keysToMerge.includes(key)
                        ? deepMerge(key)
                        : savedData[key];
                }
            }
        };
        try {
            const savedData = (await this.plugin?.loadData());
            if (savedData) {
                const keys = Object.keys(SwitcherPlusSettings.defaults);
                copy(savedData, this.data, keys);
            }
        }
        catch (err) {
            console.log('Switcher++: error loading settings, using defaults. ', err);
        }
    }
    async saveSettings() {
        const { plugin, data } = this;
        await plugin?.saveData(data);
    }
    save() {
        this.saveSettings().catch((e) => {
            console.log('Switcher++: error saving changes to settings', e);
        });
    }
    isSymbolTypeEnabled(symbol) {
        const { enabledSymbolTypes } = this.data;
        let value = SwitcherPlusSettings.defaults.enabledSymbolTypes[symbol];
        if (Object.prototype.hasOwnProperty.call(enabledSymbolTypes, symbol)) {
            value = enabledSymbolTypes[symbol];
        }
        return value;
    }
    setSymbolTypeEnabled(symbol, isEnabled) {
        this.data.enabledSymbolTypes[symbol] = isEnabled;
    }
    static async transformDataFile(plugin, defaults) {
        await SwitcherPlusSettings.transformDataFileToV1(plugin, defaults);
        await SwitcherPlusSettings.transformDataFileToV2(plugin, defaults);
    }
    static async transformDataFileToV1(plugin, defaults) {
        let isTransformed = false;
        try {
            const data = (await plugin?.loadData());
            if (data && typeof data === 'object') {
                const versionKey = 'version';
                if (!Object.prototype.hasOwnProperty.call(data, versionKey)) {
                    // rename from starred to bookmarks
                    const starredCommandKey = 'starredListCommand';
                    if (Object.prototype.hasOwnProperty.call(data, starredCommandKey)) {
                        data['bookmarksListCommand'] =
                            data[starredCommandKey] ?? defaults.bookmarksListCommand;
                        delete data[starredCommandKey];
                    }
                    // rename isStarred to isBookmarked
                    const isStarredKey = 'isStarred';
                    const adjustments = data['matchPriorityAdjustments'];
                    if (adjustments &&
                        Object.prototype.hasOwnProperty.call(adjustments, isStarredKey)) {
                        adjustments['isBookmarked'] = adjustments[isStarredKey];
                        delete adjustments[isStarredKey];
                    }
                    data[versionKey] = '1.0.0';
                    await plugin?.saveData(data);
                    isTransformed = true;
                }
            }
        }
        catch (error) {
            console.log('Switcher++: error transforming data.json to v1.0.0', error);
        }
        return isTransformed;
    }
    static async transformDataFileToV2(plugin, defaults) {
        let isTransformed = false;
        try {
            const data = (await plugin?.loadData());
            if (data && typeof data === 'object') {
                const versionKey = 'version';
                if (data[versionKey] === '1.0.0') {
                    const matchPriorityAdjustmentsKey = 'matchPriorityAdjustments';
                    if (Object.prototype.hasOwnProperty.call(data, matchPriorityAdjustmentsKey)) {
                        // Convert matchPriorityAdjustments to key/object pairs
                        // Version <= 1.0.0 type was Record<string, number>
                        const oldAdjustments = data[matchPriorityAdjustmentsKey];
                        const adjustments = {};
                        data[matchPriorityAdjustmentsKey] = {
                            isEnabled: !!data['enableMatchPriorityAdjustments'],
                            adjustments,
                        };
                        delete data['enableMatchPriorityAdjustments'];
                        Object.entries(oldAdjustments).forEach(([key, value]) => {
                            const label = defaults.matchPriorityAdjustments.adjustments[key]?.label ?? '';
                            adjustments[key] = { value, label };
                        });
                    }
                    const quickFiltersKey = 'quickFilters';
                    if (Object.prototype.hasOwnProperty.call(data, quickFiltersKey)) {
                        // convert .facetList from Array<Object> to Record<string, Object>
                        const facetListKey = 'facetList';
                        const quickFiltersData = data[quickFiltersKey];
                        const oldFacetList = quickFiltersData[facetListKey];
                        const facetList = oldFacetList?.reduce((facetMap, oldFacet) => {
                            const facetId = oldFacet['id'];
                            facetMap[facetId] = oldFacet;
                            return facetMap;
                        }, {});
                        quickFiltersData[facetListKey] = facetList;
                    }
                    data[versionKey] = '2.0.0';
                    await plugin?.saveData(data);
                    isTransformed = true;
                }
            }
        }
        catch (error) {
            console.log('Switcher++: error transforming data.json to v2.0.0', error);
        }
        return isTransformed;
    }
}

class SettingsTabSection {
    constructor(app, mainSettingsTab, config) {
        this.app = app;
        this.mainSettingsTab = mainSettingsTab;
        this.config = config;
    }
    /**
     * Creates a new Setting with the given name and description.
     * @param  {HTMLElement} containerEl
     * @param  {string} name
     * @param  {string} desc
     * @returns Setting
     */
    createSetting(containerEl, name, desc) {
        const setting = new obsidian.Setting(containerEl);
        setting.setName(name);
        setting.setDesc(desc);
        return setting;
    }
    /**
     * Create section title elements and divider.
     * @param  {HTMLElement} containerEl
     * @param  {string} title
     * @param  {string} desc?
     * @returns Setting
     */
    addSectionTitle(containerEl, title, desc = '') {
        const setting = this.createSetting(containerEl, title, desc);
        setting.setHeading();
        return setting;
    }
    /**
     * Creates a HTMLInput element setting.
     * @param  {HTMLElement} containerEl The element to attach the setting to.
     * @param  {string} name
     * @param  {string} desc
     * @param  {string} initialValue
     * @param  {StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
     * @param  {string} placeholderText?
     * @returns Setting
     */
    addTextSetting(containerEl, name, desc, initialValue, configStorageKey, placeholderText) {
        const setting = this.createSetting(containerEl, name, desc);
        setting.addText((comp) => {
            comp.setPlaceholder(placeholderText);
            comp.setValue(initialValue);
            comp.onChange((rawValue) => {
                const value = rawValue.length ? rawValue : initialValue;
                this.saveChangesToConfig(configStorageKey, value);
            });
        });
        return setting;
    }
    /**
     * Create a Checkbox element setting.
     * @param  {HTMLElement} containerEl The element to attach the setting to.
     * @param  {string} name
     * @param  {string} desc
     * @param  {boolean} initialValue
     * @param  {BooleanTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored. This can safely be set to null if the onChange handler is provided.
     * @param  {(value:string,config:SwitcherPlusSettings)=>void} onChange? optional callback to invoke instead of using configStorageKey
     * @returns Setting
     */
    addToggleSetting(containerEl, name, desc, initialValue, configStorageKey, onChange) {
        const setting = this.createSetting(containerEl, name, desc);
        setting.addToggle((comp) => {
            comp.setValue(initialValue);
            comp.onChange((value) => {
                if (onChange) {
                    onChange(value, this.config);
                }
                else {
                    this.saveChangesToConfig(configStorageKey, value);
                }
            });
        });
        return setting;
    }
    /**
     * Create a TextArea element setting.
     * @param  {HTMLElement} containerEl The element to attach the setting to.
     * @param  {string} name
     * @param  {string} desc
     * @param  {string} initialValue
     * @param  {ListTypedConfigKey|StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
     * @param  {string} placeholderText?
     * @returns Setting
     */
    addTextAreaSetting(containerEl, name, desc, initialValue, configStorageKey, placeholderText) {
        const setting = this.createSetting(containerEl, name, desc);
        setting.addTextArea((comp) => {
            comp.setPlaceholder(placeholderText);
            comp.setValue(initialValue);
            comp.onChange((rawValue) => {
                const value = rawValue.length ? rawValue : initialValue;
                const isArray = Array.isArray(this.config[configStorageKey]);
                this.saveChangesToConfig(configStorageKey, isArray ? value.split('\n') : value);
            });
        });
        return setting;
    }
    /**
     * Add a dropdown list setting
     * @param  {HTMLElement} containerEl
     * @param  {string} name
     * @param  {string} desc
     * @param  {string} initialValue option value that is initially selected
     * @param  {Record<string, string>} options
     * @param  {StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored. This can safely be set to null if the onChange handler is provided.
     * @param  {(rawValue:string,config:SwitcherPlusSettings)=>void} onChange? optional callback to invoke instead of using configStorageKey
     * @returns Setting
     */
    addDropdownSetting(containerEl, name, desc, initialValue, options, configStorageKey, onChange) {
        const setting = this.createSetting(containerEl, name, desc);
        setting.addDropdown((comp) => {
            comp.addOptions(options);
            comp.setValue(initialValue);
            comp.onChange((rawValue) => {
                if (onChange) {
                    onChange(rawValue, this.config);
                }
                else {
                    this.saveChangesToConfig(configStorageKey, rawValue);
                }
            });
        });
        return setting;
    }
    addSliderSetting(containerEl, name, desc, initialValue, limits, configStorageKey, onChange) {
        const setting = this.createSetting(containerEl, name, desc);
        // display a button to reset the slider value
        setting.addExtraButton((comp) => {
            comp.setIcon('lucide-rotate-ccw');
            comp.setTooltip('Restore default');
            comp.onClick(() => setting.components[1].setValue(0));
            return comp;
        });
        setting.addSlider((comp) => {
            comp.setLimits(limits[0], limits[1], limits[2]);
            comp.setValue(initialValue);
            comp.setDynamicTooltip();
            comp.onChange((value) => {
                if (onChange) {
                    onChange(value, this.config);
                }
                else {
                    this.saveChangesToConfig(configStorageKey, value);
                }
            });
        });
        return setting;
    }
    /**
     * Updates the internal SwitcherPlusSettings configStorageKey with value, and writes it to disk.
     * @param  {K} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
     * @param  {SwitcherPlusSettings[K]} value
     * @returns void
     */
    saveChangesToConfig(configStorageKey, value) {
        if (configStorageKey) {
            const { config } = this;
            config[configStorageKey] = value;
            config.save();
        }
    }
}

class BookmarksSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Bookmarks List Mode Settings');
        this.addTextSetting(containerEl, 'Bookmarks list mode trigger', 'Character that will trigger bookmarks list mode in the switcher', config.bookmarksListCommand, 'bookmarksListCommand', config.bookmarksListPlaceholderText);
    }
}

class CommandListSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Command List Mode Settings');
        this.addTextSetting(containerEl, 'Command list mode trigger', 'Character that will trigger command list mode in the switcher', config.commandListCommand, 'commandListCommand', config.commandListPlaceholderText);
    }
}

class RelatedItemsSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Related Items List Mode Settings');
        this.addTextSetting(containerEl, 'Related Items list mode trigger', 'Character that will trigger related items list mode in the switcher. This triggers a display of Related Items for the source file of the currently selected (highlighted) suggestion in the switcher. If there is not a suggestion, display results for the active editor.', config.relatedItemsListCommand, 'relatedItemsListCommand', config.relatedItemsListPlaceholderText);
        this.addTextSetting(containerEl, 'Related Items list mode trigger - Active editor only', 'Character that will trigger related items list mode in the switcher. This always triggers a display of Related Items for the active editor only.', config.relatedItemsListActiveEditorCommand, 'relatedItemsListActiveEditorCommand', config.relatedItemsListActiveEditorCommand);
        this.showEnabledRelatedItems(containerEl, config);
        this.addToggleSetting(containerEl, 'Exclude open files', 'Enable, related files which are already open will not be displayed in the list. Disabled, All related files will be displayed in the list.', config.excludeOpenRelatedFiles, 'excludeOpenRelatedFiles');
    }
    showEnabledRelatedItems(containerEl, config) {
        const relationTypes = Object.values(RelationType).sort();
        const relationTypesStr = relationTypes.join(', ');
        const desc = `The types of related items to show in the list. Add one type per line. Available types: ${relationTypesStr}`;
        this.createSetting(containerEl, 'Show related item types', desc).addTextArea((textArea) => {
            textArea.setValue(config.enabledRelatedItems.join('\n'));
            textArea.inputEl.addEventListener('focusout', () => {
                const values = textArea
                    .getValue()
                    .split('\n')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0);
                const invalidValues = [...new Set(values)].filter((v) => !relationTypes.includes(v));
                if (invalidValues?.length) {
                    this.showErrorPopup(invalidValues.join('<br/>'), relationTypesStr);
                }
                else {
                    config.enabledRelatedItems = values;
                    config.save();
                }
            });
        });
    }
    showErrorPopup(invalidTypes, relationTypes) {
        const popup = new obsidian.Modal(this.app);
        popup.titleEl.setText('Invalid related item type');
        popup.contentEl.innerHTML = `Changes not saved. Available relation types are: ${relationTypes}. The following types are invalid:<br/><br/>${invalidTypes}`;
        popup.open();
    }
}

class GeneralSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'General Settings');
        this.showEnabledRibbonCommands(containerEl, config);
        this.showOverrideMobileLauncher(containerEl, config);
        this.showPreferredSourceForTitle(containerEl, config);
        this.showPathDisplayFormat(containerEl, config);
        this.addToggleSetting(containerEl, 'Hide path for root items', 'When enabled, path information will be hidden for items at the root of the vault.', config.hidePathIfRoot, 'hidePathIfRoot').setClass('qsp-setting-item-indent');
        this.addTextSetting(containerEl, 'Mode trigger escape character', 'Character to indicate that a mode trigger character should be treated just as a normal text.', config.escapeCmdChar, 'escapeCmdChar');
        this.addToggleSetting(containerEl, 'Default to open in new tab', 'When enabled, navigating to un-opened files will open a new editor tab whenever possible (as if cmd/ctrl were held). When the file is already open, the existing tab will be activated. This overrides all other tab settings.', config.onOpenPreferNewTab, 'onOpenPreferNewTab');
        this.addToggleSetting(containerEl, 'Override Standard mode behavior', 'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to inject custom behavior.', config.overrideStandardModeBehaviors, 'overrideStandardModeBehaviors');
        this.addToggleSetting(containerEl, 'Show indicator icons', 'Display icons to indicate that an item is recent, bookmarked, etc..', config.showOptionalIndicatorIcons, 'showOptionalIndicatorIcons');
        this.addToggleSetting(containerEl, 'Allow Backspace key to close the Switcher', 'When the search box is empty, pressing the backspace key will close Switcher++.', config.shouldCloseModalOnBackspace, 'shouldCloseModalOnBackspace');
        this.showMatchPriorityAdjustments(containerEl, config);
        this.showInsertLinkInEditor(containerEl, config);
        this.addToggleSetting(containerEl, 'Restore previous input in Command Mode', 'When enabled, restore the last typed input in Command Mode when launched via global command hotkey.', config.preserveCommandPaletteLastInput, 'preserveCommandPaletteLastInput');
        this.addToggleSetting(containerEl, 'Restore previous input', 'When enabled, restore the last typed input when launched via global command hotkey.', config.preserveQuickSwitcherLastInput, 'preserveQuickSwitcherLastInput');
        this.addToggleSetting(containerEl, 'Display mode trigger instructions', 'When enabled, the trigger key for each mode will be displayed in the instructions section of the Switcher.', config.showModeTriggerInstructions, 'showModeTriggerInstructions');
        this.showResetFacetEachSession(containerEl, config);
    }
    showPreferredSourceForTitle(containerEl, config) {
        const options = {
            H1: 'First H₁ heading',
            Default: 'Default',
        };
        this.addDropdownSetting(containerEl, 'Preferred suggestion title source', 'The preferred source to use for the "title" text that will be searched and displayed for file based suggestions', config.preferredSourceForTitle, options, 'preferredSourceForTitle');
    }
    showPathDisplayFormat(containerEl, config) {
        const options = {};
        options[PathDisplayFormat.None.toString()] = 'Hide path';
        options[PathDisplayFormat.Full.toString()] = 'Full path';
        options[PathDisplayFormat.FolderOnly.toString()] = 'Only parent folder';
        options[PathDisplayFormat.FolderWithFilename.toString()] = 'Parent folder & filename';
        options[PathDisplayFormat.FolderPathFilenameOptional.toString()] =
            'Parent folder path (filename optional)';
        this.addDropdownSetting(containerEl, 'Preferred file path display format', 'The preferred way to display file paths in suggestions', config.pathDisplayFormat.toString(), options, null, (rawValue, config) => {
            config.pathDisplayFormat = Number(rawValue);
            config.save();
        });
    }
    showEnabledRibbonCommands(containerEl, config) {
        const modeNames = Object.values(Mode)
            .filter((v) => isNaN(Number(v)))
            .sort();
        const modeNamesStr = modeNames.join(' ');
        const desc = `Display an icon in the ribbon menu to launch specific modes. Add one mode per line. Available modes: ${modeNamesStr}`;
        this.createSetting(containerEl, 'Show ribbon icons', desc).addTextArea((textArea) => {
            textArea.setValue(config.enabledRibbonCommands.join('\n'));
            textArea.inputEl.addEventListener('focusout', () => {
                const values = textArea
                    .getValue()
                    .split('\n')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0);
                const invalidValues = Array.from(new Set(values)).filter((v) => !modeNames.includes(v));
                if (invalidValues.length) {
                    this.showErrorPopup(invalidValues.join('<br/>'), modeNamesStr);
                }
                else {
                    config.enabledRibbonCommands = values;
                    config.save();
                    // force unregister/register of ribbon commands, so the changes take
                    // effect immediately
                    this.mainSettingsTab.plugin.registerRibbonCommandIcons();
                }
            });
        });
    }
    showErrorPopup(invalidValues, validModes) {
        const popup = new obsidian.Modal(this.app);
        popup.titleEl.setText('Invalid mode');
        popup.contentEl.innerHTML = `Changes not saved. Available modes are: ${validModes}. The following are invalid:<br/><br/>${invalidValues}`;
        popup.open();
    }
    showOverrideMobileLauncher(containerEl, config) {
        const { mobileLauncher } = config;
        const desc = 'Override the "⊕" button (in the Navigation Bar) on mobile platforms to launch Switcher++ instead of the default system switcher. Select the Mode to launch Switcher++ in, or select "Do not override" to disable the feature.';
        const disableOptionKey = 'disabled'; // Option to disable the feature
        const options = { [disableOptionKey]: 'Do not override' };
        // Add each mode to the list of options
        const modeNames = getModeNames();
        modeNames.forEach((name) => {
            options[name] = name;
        });
        let initialValue = disableOptionKey;
        if (mobileLauncher.isEnabled &&
            modeNames.includes(mobileLauncher.modeString)) {
            initialValue = mobileLauncher.modeString;
        }
        this.addDropdownSetting(containerEl, 'Override default Switcher launch button (the "⊕" button) on mobile platforms', desc, initialValue, options, null, (rawValue, config) => {
            const isEnabled = rawValue !== disableOptionKey;
            config.mobileLauncher.isEnabled = isEnabled;
            if (isEnabled) {
                config.mobileLauncher.modeString = rawValue;
            }
            config.save();
            this.mainSettingsTab.plugin.updateMobileLauncherButtonOverride(isEnabled);
        });
    }
    showMatchPriorityAdjustments(containerEl, config) {
        const { matchPriorityAdjustments: { isEnabled, adjustments, fileExtAdjustments }, } = config;
        this.addToggleSetting(containerEl, 'Result priority adjustments', 'Artificially increase the match score of the specified item types by a fixed percentage so they appear higher in the results list (does not apply to Standard Mode).', isEnabled, null, (isEnabled, config) => {
            config.matchPriorityAdjustments.isEnabled = isEnabled;
            // have to wait for the save here because the call to display() will
            // trigger a read of the updated data
            config.saveSettings().then(() => {
                // reload the settings panel. This will cause the matchPriorityAdjustments
                // controls to be shown/hidden based on isEnabled status
                this.mainSettingsTab.display();
            }, (reason) => console.log('Switcher++: error saving "Result Priority Adjustments" setting. ', reason));
        });
        if (isEnabled) {
            [adjustments, fileExtAdjustments].forEach((collection) => {
                Object.entries(collection).forEach(([key, data]) => {
                    const { value, label } = data;
                    const setting = this.addSliderSetting(containerEl, label, data.desc ?? '', value, [-1, 1, 0.05], null, (value, config) => {
                        collection[key].value = value;
                        config.save();
                    });
                    setting.setClass('qsp-setting-item-indent');
                });
            });
        }
    }
    showResetFacetEachSession(containerEl, config) {
        this.addToggleSetting(containerEl, 'Reset active Quick Filters', 'When enabled, the switcher will reset all Quick Filters back to inactive for each session.', config.quickFilters.shouldResetActiveFacets, null, (value, config) => {
            config.quickFilters.shouldResetActiveFacets = value;
            config.save();
        });
    }
    showInsertLinkInEditor(containerEl, config) {
        this.createSetting(containerEl, 'Insert link in editor', '');
        let setting = this.addToggleSetting(containerEl, 'Use filename as alias', 'When enabled, the file basename will be set as the link alias.', config.insertLinkInEditor.useBasenameAsAlias, null, (value, config) => {
            config.insertLinkInEditor.useBasenameAsAlias = value;
            config.save();
        });
        setting.setClass('qsp-setting-item-indent');
        setting = this.addToggleSetting(containerEl, 'Use heading as alias', 'When enabled, the file heading will be set as the link alias. This overrides the "use filename as alias" setting.', config.insertLinkInEditor.useHeadingAsAlias, null, (value, config) => {
            config.insertLinkInEditor.useHeadingAsAlias = value;
            config.save();
        });
        setting.setClass('qsp-setting-item-indent');
    }
}

class WorkspaceSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Workspace List Mode Settings');
        this.addTextSetting(containerEl, 'Workspace list mode trigger', 'Character that will trigger workspace list mode in the switcher', config.workspaceListCommand, 'workspaceListCommand', config.workspaceListPlaceholderText);
    }
}

class EditorSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Editor List Mode Settings');
        this.addTextSetting(containerEl, 'Editor list mode trigger', 'Character that will trigger editor list mode in the switcher', config.editorListCommand, 'editorListCommand', config.editorListPlaceholderText);
        this.showIncludeSidePanelViews(containerEl, config);
        this.addToggleSetting(containerEl, 'Order default editor list by most recently accessed', 'When there is no search term, order the list of editors by most recent access time.', config.orderEditorListByAccessTime, 'orderEditorListByAccessTime');
    }
    showIncludeSidePanelViews(containerEl, config) {
        const viewsListing = Object.keys(this.app.viewRegistry.viewByType).sort().join(' ');
        const desc = `When in Editor list mode, show the following view types from the side panels. Add one view type per line. Available view types: ${viewsListing}`;
        this.addTextAreaSetting(containerEl, 'Include side panel views', desc, config.includeSidePanelViewTypes.join('\n'), 'includeSidePanelViewTypes', config.includeSidePanelViewTypesPlaceholder);
    }
}

class HeadingsSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Headings List Mode Settings');
        this.addTextSetting(containerEl, 'Headings list mode trigger', 'Character that will trigger headings list mode in the switcher', config.headingsListCommand, 'headingsListCommand', config.headingsListPlaceholderText);
        this.showHeadingSettings(containerEl, config);
        this.addToggleSetting(containerEl, 'Search Filenames', "Enabled, search and show suggestions for filenames. Disabled, Don't search through filenames (except for fallback searches)", config.shouldSearchFilenames, 'shouldSearchFilenames');
        this.addToggleSetting(containerEl, 'Search Bookmarks', "Enabled, search and show suggestions for Bookmarks. Disabled, Don't search through Bookmarks", config.shouldSearchBookmarks, 'shouldSearchBookmarks');
        this.addSliderSetting(containerEl, 'Max recent files to show', 'The maximum number of recent files to show when there is no search term', config.maxRecentFileSuggestionsOnInit, [0, 75, 1], 'maxRecentFileSuggestionsOnInit');
        this.showExcludeFolders(containerEl, config);
        this.addToggleSetting(containerEl, 'Hide Obsidian "Excluded files"', 'Enabled, do not display suggestions for files that are in Obsidian\'s "Options > Files & Links > Excluded files" list. Disabled, suggestions for those files will be displayed but downranked.', config.excludeObsidianIgnoredFiles, 'excludeObsidianIgnoredFiles');
        this.showFileExtAllowList(containerEl, config);
    }
    showHeadingSettings(containerEl, config) {
        const isEnabled = config.shouldSearchHeadings;
        this.addToggleSetting(containerEl, 'Search Headings', "Enabled, search and show suggestions for Headings. Disabled, Don't search through Headings", isEnabled, null, (isEnabled, config) => {
            config.shouldSearchHeadings = isEnabled;
            // have to wait for the save here because the call to display() will
            // trigger a read of the updated data
            config.saveSettings().then(() => {
                // reload the settings panel. This will cause the other option
                // controls to be shown/hidden based on isEnabled status
                this.mainSettingsTab.display();
            }, (reason) => console.log('Switcher++: error saving "Search Headings" setting. ', reason));
        });
        if (isEnabled) {
            let setting = this.addToggleSetting(containerEl, 'Turn off filename fallback', 'Enabled, strictly search through only the headings contained in the file. Do not fallback to searching the filename when an H1 match is not found. Disabled, fallback to searching against the filename when there is not a match in the first H1 contained in the file.', config.strictHeadingsOnly, 'strictHeadingsOnly');
            setting.setClass('qsp-setting-item-indent');
            setting = this.addToggleSetting(containerEl, 'Search all headings', 'Enabled, search through all headings contained in each file. Disabled, only search through the first H1 in each file.', config.searchAllHeadings, 'searchAllHeadings');
            setting.setClass('qsp-setting-item-indent');
        }
    }
    showFileExtAllowList(containerEl, config) {
        this.createSetting(containerEl, 'File extension override', 'Override the "Show attachments" and the "Show all file types" builtin, system Switcher settings and always search files with the listed extensions. Add one path per line. For example to add ".canvas" file extension, just add "canvas".').addTextArea((textArea) => {
            textArea.setValue(config.fileExtAllowList.join('\n'));
            textArea.inputEl.addEventListener('focusout', () => {
                const allowList = textArea
                    .getValue()
                    .split('\n')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0);
                config.fileExtAllowList = allowList;
                config.save();
            });
        });
    }
    showExcludeFolders(containerEl, config) {
        const settingName = 'Exclude folders';
        this.createSetting(containerEl, settingName, 'When in Headings list mode, folder path that match any regex listed here will not be searched for suggestions. Path should start from the Vault Root. Add one path per line.').addTextArea((textArea) => {
            textArea.setValue(config.excludeFolders.join('\n'));
            textArea.inputEl.addEventListener('focusout', () => {
                const excludes = textArea
                    .getValue()
                    .split('\n')
                    .filter((v) => v.length > 0);
                if (this.validateExcludeFolderList(settingName, excludes)) {
                    config.excludeFolders = excludes;
                    config.save();
                }
            });
        });
    }
    validateExcludeFolderList(settingName, excludes) {
        let isValid = true;
        let failedMsg = '';
        for (const str of excludes) {
            try {
                new RegExp(str);
            }
            catch (err) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                failedMsg += `<span class="qsp-warning">${str}</span><br/>${err}<br/><br/>`;
                isValid = false;
            }
        }
        if (!isValid) {
            const popup = new obsidian.Modal(this.app);
            popup.titleEl.setText(settingName);
            popup.contentEl.innerHTML = `Changes not saved. The following regex contain errors:<br/><br/>${failedMsg}`;
            popup.open();
        }
        return isValid;
    }
}

class SymbolSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        this.addSectionTitle(containerEl, 'Symbol List Mode Settings');
        this.addTextSetting(containerEl, 'Symbol list mode trigger', 'Character that will trigger symbol list mode in the switcher. This triggers a display of Symbols for the source file of the currently selected (highlighted) suggestion in the switcher. If there is not a suggestion, display results for the active editor.', config.symbolListCommand, 'symbolListCommand', config.symbolListPlaceholderText);
        this.addTextSetting(containerEl, 'Symbol list mode trigger - Active editor only', 'Character that will trigger symbol list mode in the switcher. This always triggers a display of Symbols for the active editor only.', config.symbolListActiveEditorCommand, 'symbolListActiveEditorCommand', config.symbolListActiveEditorCommand);
        this.addToggleSetting(containerEl, 'List symbols as indented outline', 'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.', config.symbolsInLineOrder, 'symbolsInLineOrder');
        this.addToggleSetting(containerEl, 'Open Symbols in new tab', 'Enabled, always open a new tab when navigating to Symbols. Disabled, navigate in an already open tab (if one exists).', config.alwaysNewTabForSymbols, 'alwaysNewTabForSymbols');
        this.addToggleSetting(containerEl, 'Open Symbols in active tab on mobile devices', 'Enabled, navigate to the target file and symbol in the active editor tab. Disabled, open a new tab when navigating to Symbols, even on mobile devices.', config.useActiveTabForSymbolsOnMobile, 'useActiveTabForSymbolsOnMobile');
        this.addToggleSetting(containerEl, 'Auto-select nearest heading', 'Enabled, in an unfiltered symbol list, select the closest preceding Heading to the current cursor position. Disabled, the first symbol in the list is selected.', config.selectNearestHeading, 'selectNearestHeading');
        this.showEnableSymbolTypesToggle(containerEl, config);
        this.showEnableLinksToggle(containerEl, config);
    }
    showEnableSymbolTypesToggle(containerEl, config) {
        const allowedSymbols = [
            ['Show Headings', SymbolType.Heading],
            ['Show Tags', SymbolType.Tag],
            ['Show Embeds', SymbolType.Embed],
            ['Show Callouts', SymbolType.Callout],
        ];
        allowedSymbols.forEach(([name, symbolType]) => {
            this.addToggleSetting(containerEl, name, '', config.isSymbolTypeEnabled(symbolType), null, (isEnabled) => {
                config.setSymbolTypeEnabled(symbolType, isEnabled);
                config.save();
            });
        });
    }
    showEnableLinksToggle(containerEl, config) {
        const isLinksEnabled = config.isSymbolTypeEnabled(SymbolType.Link);
        this.addToggleSetting(containerEl, 'Show Links', '', isLinksEnabled, null, (isEnabled) => {
            config.setSymbolTypeEnabled(SymbolType.Link, isEnabled);
            // have to wait for the save here because the call to display() will
            // trigger a read of the updated data
            config.saveSettings().then(() => {
                // reload the settings panel. This will cause the sublink types toggle
                // controls to be shown/hidden based on isLinksEnabled status
                this.mainSettingsTab.display();
            }, (reason) => console.log('Switcher++: error saving "Show Links" setting. ', reason));
        });
        if (isLinksEnabled) {
            const allowedLinkTypes = [
                ['Links to headings', LinkType.Heading],
                ['Links to blocks', LinkType.Block],
            ];
            allowedLinkTypes.forEach(([name, linkType]) => {
                const isExcluded = (config.excludeLinkSubTypes & linkType) === linkType;
                const setting = this.addToggleSetting(containerEl, name, '', !isExcluded, null, (isEnabled) => this.saveEnableSubLinkChange(linkType, isEnabled));
                setting.setClass('qsp-setting-item-indent');
            });
        }
    }
    saveEnableSubLinkChange(linkType, isEnabled) {
        const { config } = this;
        let exclusions = config.excludeLinkSubTypes;
        if (isEnabled) {
            // remove from exclusion list
            exclusions &= ~linkType;
        }
        else {
            // add to exclusion list
            exclusions |= linkType;
        }
        config.excludeLinkSubTypes = exclusions;
        config.save();
    }
}

class VaultListSettingsTabSection extends SettingsTabSection {
    display(containerEl) {
        const { config } = this;
        const titleSetting = this.addSectionTitle(containerEl, 'Vault List Mode Settings');
        titleSetting.nameEl?.createSpan({
            cls: ['qsp-tag', 'qsp-warning'],
            text: 'Experimental',
        });
        this.addTextSetting(containerEl, 'Vault list mode trigger', 'Character that will trigger vault list mode in the switcher', config.vaultListCommand, 'vaultListCommand', config.vaultListPlaceholderText);
    }
}

class SwitcherPlusSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin, config) {
        super(app, plugin);
        this.plugin = plugin;
        this.config = config;
    }
    display() {
        const { containerEl } = this;
        const tabSections = [
            GeneralSettingsTabSection,
            SymbolSettingsTabSection,
            HeadingsSettingsTabSection,
            EditorSettingsTabSection,
            RelatedItemsSettingsTabSection,
            BookmarksSettingsTabSection,
            CommandListSettingsTabSection,
            WorkspaceSettingsTabSection,
            VaultListSettingsTabSection,
        ];
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Quick Switcher++ Settings' });
        tabSections.forEach((tabSectionClass) => {
            this.displayTabSection(tabSectionClass);
        });
    }
    displayTabSection(tabSectionClass) {
        const { app, config, containerEl } = this;
        const tabSection = new tabSectionClass(app, this, config);
        tabSection.display(containerEl);
    }
}

class InputInfo {
    static get defaultParsedCommand() {
        return {
            isValidated: false,
            index: -1,
            parsedInput: null,
        };
    }
    get searchQuery() {
        return this._searchQuery;
    }
    get inputTextSansEscapeChar() {
        return this._inputTextSansEscapeChar ?? this.inputText;
    }
    set inputTextSansEscapeChar(value) {
        this._inputTextSansEscapeChar = value;
    }
    constructor(inputText = '', mode = Mode.Standard, sessionOpts) {
        this.inputText = inputText;
        this.mode = mode;
        this._inputTextSansEscapeChar = null;
        this.currentWorkspaceEnvList = {
            openWorkspaceLeaves: new Set(),
            openWorkspaceFiles: new Set(),
            fileBookmarks: new Map(),
            nonFileBookmarks: new Set(),
            mostRecentFiles: new Set(),
            attachmentFileExtensions: new Set(),
        };
        this.sessionOpts = sessionOpts ?? {};
        const symbolListCmd = {
            ...InputInfo.defaultParsedCommand,
            source: null,
        };
        const relatedItemsListCmd = {
            ...InputInfo.defaultParsedCommand,
            source: null,
        };
        const parsedCmds = {};
        this.parsedCommands = parsedCmds;
        parsedCmds[Mode.SymbolList] = symbolListCmd;
        parsedCmds[Mode.RelatedItemsList] = relatedItemsListCmd;
        [
            Mode.Standard,
            Mode.EditorList,
            Mode.WorkspaceList,
            Mode.HeadingsList,
            Mode.BookmarksList,
            Mode.CommandList,
            Mode.VaultList,
        ].forEach((mode) => {
            parsedCmds[mode] = InputInfo.defaultParsedCommand;
        });
    }
    buildSearchQuery() {
        const { mode } = this;
        const input = this.parsedCommands[mode].parsedInput ?? '';
        const prepQuery = obsidian.prepareQuery(input.trim().toLowerCase());
        const hasSearchTerm = prepQuery?.query?.length > 0;
        this._searchQuery = { prepQuery, hasSearchTerm };
    }
    parsedCommand(mode) {
        mode = mode ?? this.mode;
        return this.parsedCommands[mode];
    }
}

class Handler {
    constructor(app, settings) {
        this.app = app;
        this.settings = settings;
    }
    reset() {
        /* noop */
    }
    onNoResultsCreateAction(_inputInfo, _evt) {
        return false;
    }
    getFacets(mode) {
        if (!this.facets) {
            const facetList = this.settings?.quickFilters?.facetList;
            if (facetList) {
                this.facets = Object.values(facetList).filter((facet) => facet.mode === mode);
            }
        }
        return this.facets ?? [];
    }
    getAvailableFacets(inputInfo) {
        return this.getFacets(inputInfo.mode).filter((v) => v.isAvailable);
    }
    activateFacet(facets, isActive) {
        facets.forEach((v) => (v.isActive = isActive));
        if (!this.settings.quickFilters.shouldResetActiveFacets) {
            this.settings.save();
        }
    }
    getActiveFacetIds(inputInfo) {
        const facetIds = this.getAvailableFacets(inputInfo)
            .filter((v) => v.isActive)
            .map((v) => v.id);
        return new Set(facetIds);
    }
    isFacetedWith(activeFacetIds, facetId) {
        const hasActiveFacets = !!activeFacetIds.size;
        return (hasActiveFacets && activeFacetIds.has(facetId)) || !hasActiveFacets;
    }
    getEditorInfo(leaf) {
        const { excludeViewTypes } = this.settings;
        let file = null;
        let isValidSource = false;
        let cursor = null;
        if (leaf) {
            const { view } = leaf;
            const viewType = view.getViewType();
            file = view.file;
            cursor = this.getCursorPosition(view);
            // determine if the current active editor pane is valid
            const isCurrentEditorValid = !excludeViewTypes.includes(viewType);
            // whether or not the current active editor can be used as the target for
            // symbol search
            isValidSource = isCurrentEditorValid && !!file;
        }
        return { isValidSource, leaf, file, suggestion: null, cursor };
    }
    getSuggestionInfo(suggestion) {
        const info = this.getSourceInfoFromSuggestion(suggestion);
        let leaf = info.leaf;
        if (info.isValidSource) {
            // try to find a matching leaf for suggestion types that don't explicitly
            // provide one. This is primarily needed to be able to focus an
            // existing pane if there is one
            ({ leaf } = this.findMatchingLeaf(info.file, info.leaf));
        }
        // Get the cursor information to support `selectNearestHeading`
        const cursor = this.getCursorPosition(leaf?.view);
        return { ...info, leaf, cursor };
    }
    getSourceInfoFromSuggestion(suggestion) {
        let file = null;
        let leaf = null;
        // Can't use these suggestions as the target for another symbol command,
        // because they don't point to a file
        const invalidTypes = [
            SuggestionType.SymbolList,
            SuggestionType.Unresolved,
            SuggestionType.WorkspaceList,
            SuggestionType.CommandList,
            SuggestionType.VaultList,
        ];
        const isFileBasedSuggestion = suggestion && !invalidTypes.includes(suggestion.type);
        if (isFileBasedSuggestion) {
            file = suggestion.file;
        }
        if (isEditorSuggestion(suggestion)) {
            leaf = suggestion.item;
        }
        const isValidSource = !!file;
        return { isValidSource, leaf, file, suggestion };
    }
    /**
     * Retrieves the position of the cursor, given that view is in a Mode that supports cursors.
     * @param  {View} view
     * @returns EditorPosition
     */
    getCursorPosition(view) {
        let cursor = null;
        if (view?.getViewType() === 'markdown') {
            const md = view;
            if (md.getMode() !== 'preview') {
                const { editor } = md;
                cursor = editor.getCursor('head');
            }
        }
        return cursor;
    }
    /**
     * Returns the text of the first H1 contained in sourceFile, or sourceFile
     * path if an H1 does not exist
     * @param  {TFile} sourceFile
     * @returns string
     */
    getTitleText(sourceFile) {
        const path = stripMDExtensionFromPath(sourceFile);
        const h1 = this.getFirstH1(sourceFile);
        return h1?.heading ?? path;
    }
    /**
     * Finds and returns the first H1 from sourceFile
     * @param  {TFile} sourceFile
     * @returns HeadingCache
     */
    getFirstH1(sourceFile) {
        return Handler.getFirstH1(sourceFile, this.app.metadataCache);
    }
    static getFirstH1(sourceFile, metadataCache) {
        let h1 = null;
        const headingList = metadataCache.getFileCache(sourceFile)?.headings?.filter((v) => v.level === 1) ??
            [];
        if (headingList.length) {
            h1 = headingList.reduce((acc, curr) => {
                const { line: currLine } = curr.position.start;
                const accLine = acc.position.start.line;
                return currLine < accLine ? curr : acc;
            });
        }
        return h1;
    }
    /**
     * Finds the first open WorkspaceLeaf that is showing source file.
     * @param  {TFile} file The source file that is being shown to find
     * @param  {WorkspaceLeaf} leaf An already open editor, or, a 'reference' WorkspaceLeaf (example: backlinks, outline, etc.. views) that is used to find the associated editor if one exists.
     * @param  {} shouldIncludeRefViews=false set to true to make reference view types valid return candidates.
     * @returns TargetInfo
     */
    findMatchingLeaf(file, leaf, shouldIncludeRefViews = false) {
        let matchingLeaf = null;
        const hasSourceLeaf = !!leaf;
        const { settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes }, } = this;
        const isMatch = (candidateLeaf) => {
            let val = false;
            if (candidateLeaf?.view) {
                const isCandidateRefView = referenceViews.includes(candidateLeaf.view.getViewType());
                const isValidCandidate = shouldIncludeRefViews || !isCandidateRefView;
                const isSourceRefView = hasSourceLeaf && referenceViews.includes(leaf.view.getViewType());
                if (isValidCandidate) {
                    if (hasSourceLeaf && (shouldIncludeRefViews || !isSourceRefView)) {
                        val = candidateLeaf === leaf;
                    }
                    else {
                        val = candidateLeaf.view.file === file;
                    }
                }
            }
            return val;
        };
        // Prioritize the active leaf matches first, otherwise find the first matching leaf
        const activeLeaf = this.getActiveLeaf();
        if (isMatch(activeLeaf)) {
            matchingLeaf = activeLeaf;
        }
        else {
            const leaves = this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes);
            // put leaf at the first index so it gets checked first
            matchingLeaf = [leaf, ...leaves].find(isMatch);
        }
        return {
            leaf: matchingLeaf ?? null,
            file,
            suggestion: null,
            isValidSource: false,
        };
    }
    /** Determines if an existing tab should be reused, or create new tab, or create new window based on evt and taking into account user preferences
     * @param  {MouseEvent|KeyboardEvent} evt
     * @param  {boolean} isAlreadyOpen?
     * @param  {Mode} mode? Only Symbol mode has special handling.
     * @returns {navType: boolean | PaneType; splitDirection: SplitDirection}
     */
    extractTabNavigationType(evt, isAlreadyOpen, mode) {
        const splitDirection = evt?.shiftKey ? 'horizontal' : 'vertical';
        const key = evt?.key;
        let navType = obsidian.Keymap.isModEvent(evt) ?? false;
        if (navType === true || navType === 'tab') {
            if (key === 'o') {
                // cmd-o to create new window
                navType = 'window';
            }
            else if (key === '\\') {
                // cmd-\ to create split
                navType = 'split';
            }
        }
        navType = this.applyTabCreationPreferences(navType, isAlreadyOpen, mode);
        return { navType, splitDirection };
    }
    /**
     * Determines whether or not a new leaf should be created taking user
     * settings into account
     * @param  {PaneType | boolean} navType
     * @param  {} isAlreadyOpen=false Set to true if there is a pane showing the file already
     * @param  {Mode} mode? Only Symbol mode has special handling.
     * @returns boolean
     */
    applyTabCreationPreferences(navType, isAlreadyOpen = false, mode) {
        let preferredNavType = navType;
        const { onOpenPreferNewTab, alwaysNewTabForSymbols, useActiveTabForSymbolsOnMobile } = this.settings;
        if (navType === false) {
            if (onOpenPreferNewTab) {
                preferredNavType = !isAlreadyOpen;
            }
            else if (mode === Mode.SymbolList) {
                preferredNavType = obsidian.Platform.isMobile
                    ? !useActiveTabForSymbolsOnMobile
                    : alwaysNewTabForSymbols;
            }
        }
        return preferredNavType;
    }
    /**
     * Determines if a leaf belongs to the main editor panel (workspace.rootSplit or
     * workspace.floatingSplit) as opposed to the side panels
     * @param  {WorkspaceLeaf} leaf
     * @returns boolean
     */
    isMainPanelLeaf(leaf) {
        const { workspace } = this.app;
        const root = leaf?.getRoot();
        return root === workspace.rootSplit || root === workspace.floatingSplit;
    }
    /**
     * Reveals and optionally bring into focus a WorkspaceLeaf, including leaves
     * from the side panels.
     * @param  {WorkspaceLeaf} leaf
     * @param  {Record<string, unknown>} eState?
     * @returns void
     */
    activateLeaf(leaf, eState) {
        const { workspace } = this.app;
        const isInSidePanel = !this.isMainPanelLeaf(leaf);
        const state = { focus: true, ...eState };
        if (isInSidePanel) {
            workspace.revealLeaf(leaf);
        }
        workspace.setActiveLeaf(leaf, { focus: true });
        leaf.view.setEphemeralState(state);
    }
    /**
     * Returns a array of all open WorkspaceLeaf taking into account
     * excludeMainPanelViewTypes and includeSidePanelViewTypes.
     * @param  {string[]} excludeMainPanelViewTypes?
     * @param  {string[]} includeSidePanelViewTypes?
     * @returns WorkspaceLeaf[]
     */
    getOpenLeaves(excludeMainPanelViewTypes, includeSidePanelViewTypes, options) {
        const leaves = [];
        const saveLeaf = (l) => {
            const viewType = l?.view?.getViewType();
            if (this.isMainPanelLeaf(l)) {
                if (!excludeMainPanelViewTypes?.includes(viewType)) {
                    leaves.push(l);
                }
            }
            else if (includeSidePanelViewTypes?.includes(viewType)) {
                leaves.push(l);
            }
        };
        this.app.workspace.iterateAllLeaves(saveLeaf);
        if (options?.orderByAccessTime) {
            leaves.sort((a, b) => {
                const t1 = a?.activeTime ?? 0;
                const t2 = b?.activeTime ?? 0;
                return t2 - t1;
            });
        }
        return leaves;
    }
    /**
     * Loads a file into a WorkspaceLeaf based on navType
     * @param  {TFile} file
     * @param  {PaneType|boolean} navType
     * @param  {OpenViewState} openState?
     * @param  {SplitDirection} splitDirection if navType is 'split', the direction to
     * open the split. Defaults to 'vertical'
     * @returns void
     */
    async openFileInLeaf(file, navType, openState, splitDirection = 'vertical') {
        const { workspace } = this.app;
        const leaf = navType === 'split'
            ? workspace.getLeaf(navType, splitDirection)
            : workspace.getLeaf(navType);
        await leaf.openFile(file, openState);
    }
    /**
     * Determines whether to activate (make active and focused) an existing WorkspaceLeaf
     * (searches through all leaves), or create a new WorkspaceLeaf, or reuse an unpinned
     * WorkspaceLeaf, or create a new window in order to display file. This takes user
     * settings and event status into account.
     * @param  {MouseEvent|KeyboardEvent} evt navigation trigger event
     * @param  {TFile} file The file to display
     * @param  {string} errorContext Custom text to save in error messages
     * @param  {OpenViewState} openState? State to pass to the new, or activated view. If
     * falsy, default values will be used
     * @param  {WorkspaceLeaf} leaf? WorkspaceLeaf, or reference WorkspaceLeaf
     * (backlink, outline, etc..) to activate if it's already known
     * @param  {Mode} mode? Only Symbol mode has custom handling
     * @param  {boolean} shouldIncludeRefViews whether reference WorkspaceLeaves are valid
     * targets for activation
     * @returns void
     */
    navigateToLeafOrOpenFile(evt, file, errorContext, openState, leaf, mode, shouldIncludeRefViews = false) {
        this.navigateToLeafOrOpenFileAsync(evt, file, openState, leaf, mode, shouldIncludeRefViews).catch((reason) => {
            console.log(`Switcher++: error navigating to open file. ${errorContext}`, reason);
        });
    }
    /**
     * Determines whether to activate (make active and focused) an existing WorkspaceLeaf
     * (searches through all leaves), or create a new WorkspaceLeaf, or reuse an unpinned
     * WorkspaceLeaf, or create a new window in order to display file. This takes user
     * settings and event status into account.
     * @param  {MouseEvent|KeyboardEvent} evt navigation trigger event
     * @param  {TFile} file The file to display
     * @param  {OpenViewState} openState? State to pass to the new, or activated view. If
     * falsy, default values will be used
     * @param  {WorkspaceLeaf} leaf? WorkspaceLeaf, or reference WorkspaceLeaf
     * (backlink, outline, etc..) to activate if it's already known
     * @param  {Mode} mode? Only Symbol mode has custom handling
     * @param  {boolean} shouldIncludeRefViews whether reference WorkspaceLeaves are valid
     * targets for activation
     * @returns void
     */
    async navigateToLeafOrOpenFileAsync(evt, file, openState, leaf, mode, shouldIncludeRefViews = false) {
        const { leaf: targetLeaf } = this.findMatchingLeaf(file, leaf, shouldIncludeRefViews);
        const isAlreadyOpen = !!targetLeaf;
        const { navType, splitDirection } = this.extractTabNavigationType(evt, isAlreadyOpen, mode);
        await this.activateLeafOrOpenFile(navType, file, targetLeaf, openState, splitDirection);
    }
    /**
     * Activates leaf (if provided), or load file into another leaf based on navType
     * @param  {PaneType|boolean} navType
     * @param  {TFile} file
     * @param  {WorkspaceLeaf} leaf? optional if supplied and navType is
     * false then leaf will be activated
     * @param  {OpenViewState} openState?
     * @param  {SplitDirection} splitDirection? if navType is 'split', the direction to
     * open the split
     * @returns void
     */
    async activateLeafOrOpenFile(navType, file, leaf, openState, splitDirection) {
        // default to having the pane active and focused
        openState = openState ?? { active: true, eState: { active: true, focus: true } };
        if (leaf && navType === false) {
            const eState = openState?.eState;
            this.activateLeaf(leaf, eState);
        }
        else {
            await this.openFileInLeaf(file, navType, openState, splitDirection);
        }
    }
    /**
     * Renders the UI elements to display path information for file using the
     * stored configuration settings
     * @param  {HTMLElement} parentEl containing element, this should be the element with
     * the "suggestion-content" style
     * @param  {TFile} file
     * @param  {boolean} excludeOptionalFilename? set to true to hide the filename in cases
     * where when {PathDisplayFormat} is set to FolderPathFilenameOptional
     * @param  {SearchResult} match?
     * @param  {boolean} overridePathFormat? set to true force display the path and set
     * {PathDisplayFormat} to FolderPathFilenameOptional
     * @returns void
     */
    renderPath(parentEl, file, excludeOptionalFilename, match, overridePathFormat) {
        if (parentEl && file) {
            const isRoot = file.parent.isRoot();
            let format = this.settings.pathDisplayFormat;
            let hidePath = format === PathDisplayFormat.None || (isRoot && this.settings.hidePathIfRoot);
            if (overridePathFormat) {
                format = PathDisplayFormat.FolderPathFilenameOptional;
                hidePath = false;
            }
            if (!hidePath) {
                const wrapperEl = parentEl.createDiv({ cls: ['suggestion-note', 'qsp-note'] });
                const path = this.getPathDisplayText(file, format, excludeOptionalFilename);
                const iconEl = wrapperEl.createSpan({ cls: ['qsp-path-indicator'] });
                obsidian.setIcon(iconEl, 'folder');
                const pathEl = wrapperEl.createSpan({ cls: 'qsp-path' });
                obsidian.renderResults(pathEl, path, match);
            }
        }
    }
    /**
     * Formats the path of file based on displayFormat
     * @param  {TFile} file
     * @param  {PathDisplayFormat} displayFormat
     * @param  {boolean} excludeOptionalFilename? Only applicable to
     * {PathDisplayFormat.FolderPathFilenameOptional}. When true will exclude the filename from the returned string
     * @returns string
     */
    getPathDisplayText(file, displayFormat, excludeOptionalFilename) {
        let text = '';
        if (file) {
            const { parent } = file;
            const dirname = parent.name;
            const isRoot = parent.isRoot();
            // root path is expected to always be "/"
            const rootPath = this.app.vault.getRoot().path;
            switch (displayFormat) {
                case PathDisplayFormat.FolderWithFilename:
                    text = isRoot ? `${file.name}` : obsidian.normalizePath(`${dirname}/${file.name}`);
                    break;
                case PathDisplayFormat.FolderOnly:
                    text = isRoot ? rootPath : dirname;
                    break;
                case PathDisplayFormat.Full:
                    text = file.path;
                    break;
                case PathDisplayFormat.FolderPathFilenameOptional:
                    if (excludeOptionalFilename) {
                        text = parent.path;
                        if (!isRoot) {
                            text += rootPath; // add explicit trailing /
                        }
                    }
                    else {
                        text = this.getPathDisplayText(file, PathDisplayFormat.Full);
                    }
                    break;
            }
        }
        return text;
    }
    /**
     * Creates the UI elements to display the primary suggestion text using
     * the correct styles.
     * @param  {HTMLElement} parentEl containing element, this should be the element with
     * the "suggestion-item" style
     * @param  {string} content
     * @param  {SearchResult} match
     * @param  {number} offset?
     * @returns HTMLDivElement
     */
    renderContent(parentEl, content, match, offset) {
        const contentEl = parentEl.createDiv({
            cls: ['suggestion-content', 'qsp-content'],
        });
        const titleEl = contentEl.createDiv({
            cls: ['suggestion-title', 'qsp-title'],
        });
        obsidian.renderResults(titleEl, content, match, offset);
        return contentEl;
    }
    /** add the base suggestion styles to the suggestion container element
     * @param  {HTMLElement} parentEl container element
     * @param  {string[]} additionalStyles? optional styles to add
     */
    addClassesToSuggestionContainer(parentEl, additionalStyles) {
        const styles = ['mod-complex'];
        if (additionalStyles) {
            styles.push(...additionalStyles);
        }
        parentEl?.addClasses(styles);
    }
    /**
     * Searches through primaryString, if not match is found,
     * searches through secondaryString
     * @param  {PreparedQuery} prepQuery
     * @param  {string} primaryString
     * @param  {string} secondaryString?
     * @returns { isPrimary: boolean; match?: SearchResult }
     */
    fuzzySearchStrings(prepQuery, primaryString, secondaryString) {
        let isPrimary = false;
        let match = null;
        if (primaryString) {
            match = obsidian.fuzzySearch(prepQuery, primaryString);
            isPrimary = !!match;
        }
        if (!match && secondaryString) {
            match = obsidian.fuzzySearch(prepQuery, secondaryString);
            if (match) {
                match.score -= 1;
            }
        }
        return {
            isPrimary,
            match,
        };
    }
    /**
     * Searches through primaryText, if no match is found and file is not null, it will
     * fallback to searching 1) file.basename, 2) file.path
     * @param  {PreparedQuery} prepQuery
     * @param  {string} primaryString
     * @param  {PathSegments} pathSegments? TFile like object containing the basename and full path.
     * @returns SearchResultWithFallback
     */
    fuzzySearchWithFallback(prepQuery, primaryString, pathSegments) {
        let matchType = MatchType.None;
        let matchText;
        let match = null;
        let res = this.fuzzySearchStrings(prepQuery, primaryString);
        if (res.match) {
            match = res.match;
            matchType = MatchType.Primary;
            matchText = primaryString;
        }
        else if (pathSegments) {
            const { basename, path } = pathSegments;
            // Note: the fallback to path has to search through the entire path
            // because search needs to match over the filename/basename boundaries
            // e.g. search string "to my" should match "path/to/myfile.md"
            // that means MatchType.Basename will always be in the basename, while
            // MatchType.ParentPath can span both filename and basename
            res = this.fuzzySearchStrings(prepQuery, basename, path);
            if (res.isPrimary) {
                matchType = MatchType.Basename;
                matchText = basename;
            }
            else if (res.match) {
                matchType = MatchType.Path;
                matchText = path;
            }
            match = res.match;
        }
        return { matchType, matchText, match };
    }
    /**
     * Separate match into two groups, one that only matches the path segment of file, and
     * a second that only matches the filename segment
     * @param  {PathSegments} pathSegments
     * @param  {SearchResult} match
     * @returns {SearchResult; SearchResult}
     */
    splitSearchMatchesAtBasename(pathSegments, match) {
        let basenameMatch = null;
        let pathMatch = null;
        // function to re-anchor offsets by a certain amount
        const decrementOffsets = (offsets, amount) => {
            offsets.forEach((offset) => {
                offset[0] -= amount;
                offset[1] -= amount;
            });
        };
        if (pathSegments && match?.matches) {
            const nameIndex = pathSegments.path.lastIndexOf(pathSegments.basename);
            if (nameIndex >= 0) {
                const { matches, score } = match;
                const matchStartIndex = matches[0][0];
                const matchEndIndex = matches[matches.length - 1][1];
                if (matchStartIndex >= nameIndex) {
                    // the entire match offset is in the basename segment, so match can be used
                    // for basename
                    basenameMatch = match;
                    decrementOffsets(basenameMatch.matches, nameIndex);
                }
                else if (matchEndIndex <= nameIndex) {
                    // the entire match offset is in the path segment
                    pathMatch = match;
                }
                else {
                    // the match offset spans both path and basename, so they will have to
                    // to be split up. Note that the entire SearchResult can span both, and
                    // a single SearchMatchPart inside the SearchResult can also span both
                    let i = matches.length;
                    while (i--) {
                        const matchPartStartIndex = matches[i][0];
                        const matchPartEndIndex = matches[i][1];
                        const nextMatchPartIndex = i + 1;
                        if (matchPartEndIndex <= nameIndex) {
                            // the last path segment MatchPart ends cleanly in the path segment
                            pathMatch = { score, matches: matches.slice(0, nextMatchPartIndex) };
                            basenameMatch = { score, matches: matches.slice(nextMatchPartIndex) };
                            decrementOffsets(basenameMatch.matches, nameIndex);
                            break;
                        }
                        else if (matchPartStartIndex < nameIndex) {
                            // the last MatchPart starts in path segment and ends in basename segment
                            // adjust the end of the path segment MatchPart to finish at the end
                            // of the path segment
                            let offsets = matches.slice(0, nextMatchPartIndex);
                            offsets[offsets.length - 1] = [matchPartStartIndex, nameIndex];
                            pathMatch = { score, matches: offsets };
                            // adjust the beginning of the first basename segment MatchPart to start
                            // at the beginning of the basename segment
                            offsets = matches.slice(i);
                            decrementOffsets(offsets, nameIndex);
                            offsets[0][0] = 0;
                            basenameMatch = { score, matches: offsets };
                            break;
                        }
                    }
                }
            }
        }
        return { pathMatch, basenameMatch };
    }
    /**
     * Display the provided information as a suggestion with the content and path information on separate lines
     * @param  {HTMLElement} parentEl
     * @param  {string[]} parentElStyles
     * @param  {string} primaryString
     * @param  {TFile} file
     * @param  {MatchType} matchType
     * @param  {SearchResult} match
     * @param  {} excludeOptionalFilename=true
     * @returns void
     */
    renderAsFileInfoPanel(parentEl, parentElStyles, primaryString, file, matchType, match, excludeOptionalFilename = true) {
        let primaryMatch = null;
        let pathMatch = null;
        if (primaryString?.length) {
            if (matchType === MatchType.Primary) {
                primaryMatch = match;
            }
            else if (matchType === MatchType.Path) {
                pathMatch = match;
            }
        }
        else if (file) {
            primaryString = file.basename;
            if (matchType === MatchType.Basename) {
                primaryMatch = match;
            }
            else if (matchType === MatchType.Path) {
                // MatchType.ParentPath can span both filename and basename
                // (partial match in each) so try to split the match offsets
                ({ pathMatch, basenameMatch: primaryMatch } = this.splitSearchMatchesAtBasename(file, match));
            }
        }
        this.addClassesToSuggestionContainer(parentEl, parentElStyles);
        const contentEl = this.renderContent(parentEl, primaryString, primaryMatch);
        this.renderPath(contentEl, file, excludeOptionalFilename, pathMatch, !!pathMatch);
    }
    /**
     * Returns the currently active leaf across all root workspace splits
     * @returns WorkspaceLeaf | null
     */
    getActiveLeaf() {
        return Handler.getActiveLeaf(this.app.workspace);
    }
    /**
     * Returns the currently active leaf across all root workspace splits
     * @param  {Workspace} workspace
     * @returns WorkspaceLeaf | null
     */
    static getActiveLeaf(workspace) {
        const leaf = workspace?.getActiveViewOfType(obsidian.View)?.leaf;
        return leaf ?? null;
    }
    /**
     * Displays extra flair icons for an item, and adds any associated css classes
     * to parentEl
     * @param  {HTMLElement} parentEl the suggestion container element
     * @param  {AnySuggestion} sugg the suggestion item
     * @param  {HTMLDivElement=null} flairContainerEl optional, if null, it will be created
     * @returns HTMLDivElement the flairContainerEl that was passed in or created
     */
    renderOptionalIndicators(parentEl, sugg, flairContainerEl = null) {
        const { showOptionalIndicatorIcons } = this.settings;
        const indicatorData = new Map();
        indicatorData.set('isRecent', {
            iconName: 'history',
            parentElClass: 'qsp-recent-file',
            indicatorElClass: 'qsp-recent-indicator',
        });
        indicatorData.set('isOpenInEditor', {
            iconName: 'lucide-file-edit',
            parentElClass: 'qsp-open-editor',
            indicatorElClass: 'qsp-editor-indicator',
        });
        indicatorData.set('isBookmarked', {
            iconName: 'lucide-bookmark',
            parentElClass: 'qsp-bookmarked-file',
            indicatorElClass: 'qsp-bookmarked-indicator',
        });
        if (!flairContainerEl) {
            flairContainerEl = this.createFlairContainer(parentEl);
        }
        if (showOptionalIndicatorIcons) {
            for (const [state, data] of indicatorData.entries()) {
                if (sugg[state] === true) {
                    if (data.parentElClass) {
                        parentEl?.addClass(data.parentElClass);
                    }
                    this.renderIndicator(flairContainerEl, [data.indicatorElClass], data.iconName);
                }
            }
        }
        return flairContainerEl;
    }
    /**
     * @param  {HTMLDivElement} flairContainerEl
     * @param  {string[]} indicatorClasses additional css classes to add to flair element
     * @param  {string} svgIconName? the name of the svg icon to use
     * @param  {string} indicatorText? the text content of the flair element
     * @returns HTMLElement the flair icon wrapper element
     */
    renderIndicator(flairContainerEl, indicatorClasses, svgIconName, indicatorText) {
        const cls = ['suggestion-flair', ...indicatorClasses];
        const flairEl = flairContainerEl?.createSpan({ cls });
        if (flairEl) {
            if (svgIconName) {
                flairEl.addClass('svg-icon');
                obsidian.setIcon(flairEl, svgIconName);
            }
            if (indicatorText) {
                flairEl.setText(indicatorText);
            }
        }
        return flairEl;
    }
    /**
     * Creates a child Div element with the appropriate css classes for flair icons
     * @param  {HTMLElement} parentEl
     * @returns HTMLDivElement
     */
    createFlairContainer(parentEl) {
        return parentEl?.createDiv({ cls: ['suggestion-aux', 'qsp-aux'] });
    }
    /**
     * Retrieves a TFile object using path. Return null if path does not represent
     * a TFile object.
     * @param  {string} path
     * @returns TFile|null
     */
    getTFileByPath(path) {
        return getTFileByPath(path, this.app.vault);
    }
    /**
     * Downranks suggestions for files that live in Obsidian ignored paths, or,
     * increases the suggestion score by a factor specified in settings. This instance
     * version just forwards to the static version
     * @param  {V} sugg the suggestion objects
     * @returns V
     */
    applyMatchPriorityPreferences(sugg) {
        return Handler.applyMatchPriorityPreferences(sugg, this.settings, this.app.metadataCache);
    }
    /**
     * Downranks suggestions for files that live in Obsidian ignored paths, or,
     * increases the suggestion score by a factor specified in settings.
     * @param  {V} sugg the suggestion objects
     * @param  {SwitcherPlusSettings} settings
     * @param  {MetadataCache} metadataCache
     * @returns V
     */
    static applyMatchPriorityPreferences(sugg, settings, metadataCache) {
        if (sugg?.match) {
            const { match, type, file } = sugg;
            if (file && metadataCache?.isUserIgnored(file.path)) {
                // downrank suggestions that are in an obsidian ignored paths
                sugg.downranked = true;
                sugg.match.score -= 10;
            }
            else if (settings?.matchPriorityAdjustments?.isEnabled) {
                const { matchPriorityAdjustments } = settings;
                const adjustments = matchPriorityAdjustments.adjustments ?? {};
                const fileExtAdjustments = matchPriorityAdjustments.fileExtAdjustments ?? {};
                let factor = 0;
                const getFactor = (key, collection) => {
                    collection = collection ?? adjustments;
                    let val = 0;
                    if (Object.prototype.hasOwnProperty.call(collection, key)) {
                        val = Number(collection[key]?.value);
                    }
                    return isNaN(val) ? 0 : val;
                };
                const getFactorConstrained = (searchType, searchKey) => {
                    let val = 0;
                    if ((searchType !== null && searchType === type) || sugg[searchKey]) {
                        val = getFactor(searchKey);
                    }
                    return val;
                };
                factor += getFactorConstrained(SuggestionType.Bookmark, 'isBookmarked');
                factor += getFactorConstrained(SuggestionType.EditorList, 'isOpenInEditor');
                factor += getFactorConstrained(null, 'isRecent');
                factor += getFactorConstrained(null, 'isAttachment');
                factor += getFactor(file?.extension, fileExtAdjustments);
                if (isHeadingSuggestion(sugg)) {
                    factor += getFactor(`h${sugg.item?.level}`);
                }
                // check for adjustments defined for other suggestion types, the types that are
                // explicitly checked above should not be in the adjustment list so
                // they don't get counted twice (above and then again here)
                const typeStr = type.toString();
                factor += getFactor(typeStr);
                // update score by the percentage define by factor
                // find one percent of score by dividing the absolute value of score by 100,
                // multiply factor by 100 to convert into percentage
                // multiply the two to get the change amount, and add it to score
                match.score += (Math.abs(match.score) / 100) * (factor * 100);
            }
        }
        return sugg;
    }
    /**
     * Sets isOpenInEditor, isRecent, isBookmarked, isAttachment, status of sugg
     * based on currentWorkspaceEnvList
     * @param  {WorkspaceEnvList} currentWorkspaceEnvList
     * @param  {V} sugg
     * @returns V
     */
    static updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg) {
        if (currentWorkspaceEnvList && sugg?.file) {
            const { file } = sugg;
            sugg.isOpenInEditor = currentWorkspaceEnvList.openWorkspaceFiles?.has(file);
            sugg.isRecent = currentWorkspaceEnvList.mostRecentFiles?.has(file);
            sugg.isBookmarked = currentWorkspaceEnvList.fileBookmarks?.has(file);
            sugg.isAttachment = currentWorkspaceEnvList.attachmentFileExtensions?.has(file.extension);
        }
        return sugg;
    }
    /**
     * Renders a suggestion hint for creating a new note
     * @param  {HTMLElement} parentEl
     * @param  {string} filename
     * @returns HTMLDivElement
     */
    renderFileCreationSuggestion(parentEl, filename) {
        this.addClassesToSuggestionContainer(parentEl);
        const contentEl = this.renderContent(parentEl, filename, null);
        const flairEl = this.createFlairContainer(parentEl);
        flairEl?.createSpan({
            cls: 'suggestion-hotkey',
            text: 'Enter to create',
        });
        return contentEl;
    }
    /**
     * Creates a new note in the vault with filename. Uses evt to determine the
     * navigation type (reuse tab, new tab, new window) to use for opening the newly
     * created note.
     * @param  {string} filename
     * @param  {MouseEvent|KeyboardEvent} evt
     * @returns void
     */
    createFile(filename, evt) {
        const { workspace } = this.app;
        const { navType } = this.extractTabNavigationType(evt);
        const activeView = workspace.getActiveViewOfType(obsidian.FileView);
        let sourcePath = '';
        if (activeView?.file) {
            sourcePath = activeView.file.path;
        }
        workspace
            .openLinkText(filename, sourcePath, navType, { active: true })
            .catch((err) => {
            console.log('Switcher++: error creating new file. ', err);
        });
    }
}

const WORKSPACE_PLUGIN_ID = 'workspaces';
class WorkspaceHandler extends Handler {
    getCommandString(_sessionOpts) {
        return this.settings?.workspaceListCommand;
    }
    validateCommand(inputInfo, index, filterText, _activeSuggestion, _activeLeaf) {
        const cmd = inputInfo.parsedCommand(Mode.WorkspaceList);
        if (this.getEnabledWorkspacesPluginInstance()) {
            inputInfo.mode = Mode.WorkspaceList;
            cmd.index = index;
            cmd.parsedInput = filterText;
            cmd.isValidated = true;
        }
        return cmd;
    }
    getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            inputInfo.buildSearchQuery();
            const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
            const items = this.getItems();
            items.forEach((item) => {
                let shouldPush = true;
                let match = null;
                if (hasSearchTerm) {
                    match = obsidian.fuzzySearch(prepQuery, item.id);
                    shouldPush = !!match;
                }
                if (shouldPush) {
                    suggestions.push({ type: SuggestionType.WorkspaceList, item, match });
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-workspace']);
            this.renderContent(parentEl, sugg.item.id, sugg.match);
            handled = true;
        }
        return handled;
    }
    onChooseSuggestion(sugg, _evt) {
        let handled = false;
        if (sugg) {
            const { id } = sugg.item;
            const pluginInstance = this.getEnabledWorkspacesPluginInstance();
            if (pluginInstance) {
                pluginInstance.loadWorkspace(id);
            }
            handled = true;
        }
        return handled;
    }
    onNoResultsCreateAction(inputInfo, _evt) {
        const pluginInstance = this.getEnabledWorkspacesPluginInstance();
        if (pluginInstance) {
            const input = inputInfo.parsedCommand(Mode.WorkspaceList)?.parsedInput;
            // create a new workspace and set it active
            pluginInstance.saveWorkspace(input);
            pluginInstance.setActiveWorkspace(input);
        }
        return true;
    }
    getItems() {
        const items = [];
        const workspaces = this.getEnabledWorkspacesPluginInstance()?.workspaces;
        if (workspaces) {
            Object.keys(workspaces).forEach((id) => items.push({ id, type: 'workspaceInfo' }));
        }
        return items.sort((a, b) => a.id.localeCompare(b.id));
    }
    getEnabledWorkspacesPluginInstance() {
        return getInternalEnabledPluginById(this.app, WORKSPACE_PLUGIN_ID);
    }
}

class StandardExHandler extends Handler {
    getCommandString(_sessionOpts) {
        return '';
    }
    validateCommand(_inputInfo, _index, _filterText, _activeSuggestion, _activeLeaf) {
        throw new Error('Method not implemented.');
    }
    getSuggestions(_inputInfo) {
        throw new Error('Method not implemented.');
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (isFileSuggestion(sugg)) {
            handled = this.renderFileSuggestion(sugg, parentEl);
        }
        else {
            handled = this.renderAliasSuggestion(sugg, parentEl);
        }
        if (sugg?.downranked) {
            parentEl.addClass('mod-downranked');
        }
        return handled;
    }
    onChooseSuggestion(sugg, evt) {
        let handled = false;
        if (sugg) {
            const { file } = sugg;
            this.navigateToLeafOrOpenFile(evt, file, `Unable to open file from SystemSuggestion ${file.path}`);
            handled = true;
        }
        return handled;
    }
    renderFileSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { file, matchType, match } = sugg;
            this.renderAsFileInfoPanel(parentEl, ['qsp-suggestion-file'], null, file, matchType, match);
            this.renderOptionalIndicators(parentEl, sugg);
            handled = true;
        }
        return handled;
    }
    renderAliasSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { file, matchType, match } = sugg;
            this.renderAsFileInfoPanel(parentEl, ['qsp-suggestion-alias'], sugg.alias, file, matchType, match, false);
            const flairContainerEl = this.renderOptionalIndicators(parentEl, sugg);
            this.renderIndicator(flairContainerEl, ['qsp-alias-indicator'], 'lucide-forward');
            handled = true;
        }
        return handled;
    }
    addPropertiesToStandardSuggestions(inputInfo, sugg) {
        const { match, file } = sugg;
        const matches = match?.matches;
        let matchType = MatchType.None;
        let matchText = null;
        if (matches) {
            if (isAliasSuggestion(sugg)) {
                matchType = MatchType.Primary;
                matchText = sugg.alias;
            }
            else {
                matchType = MatchType.Path;
                matchText = file?.path;
            }
        }
        sugg.matchType = matchType;
        sugg.matchText = matchText;
        // patch with missing properties required for enhanced custom rendering
        Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
    }
    static createUnresolvedSuggestion(linktext, result, settings, metadataCache) {
        const sugg = {
            linktext,
            type: SuggestionType.Unresolved,
            ...result,
        };
        return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
    }
}

class EditorHandler extends Handler {
    getCommandString(_sessionOpts) {
        return this.settings?.editorListCommand;
    }
    validateCommand(inputInfo, index, filterText, _activeSuggestion, _activeLeaf) {
        inputInfo.mode = Mode.EditorList;
        const cmd = inputInfo.parsedCommand(Mode.EditorList);
        cmd.index = index;
        cmd.parsedInput = filterText;
        cmd.isValidated = true;
        return cmd;
    }
    getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            inputInfo.buildSearchQuery();
            const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
            const items = this.getItems();
            items.forEach((item) => {
                const file = item.view?.file;
                let shouldPush = true;
                let result = { matchType: MatchType.None, match: null };
                const preferredTitle = this.getPreferredTitle(item, this.settings.preferredSourceForTitle);
                if (hasSearchTerm) {
                    result = this.fuzzySearchWithFallback(prepQuery, preferredTitle, file);
                    shouldPush = result.matchType !== MatchType.None;
                }
                if (shouldPush) {
                    suggestions.push(this.createSuggestion(inputInfo.currentWorkspaceEnvList, item, file, result, preferredTitle));
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    getPreferredTitle(leaf, titleSource) {
        return EditorHandler.getPreferredTitle(leaf, titleSource, this.app.metadataCache);
    }
    static getPreferredTitle(leaf, titleSource, metadataCache) {
        const { view } = leaf;
        const file = view?.file;
        let text = leaf.getDisplayText();
        if (titleSource === 'H1' && file) {
            const h1 = EditorHandler.getFirstH1(file, metadataCache);
            if (h1) {
                text = text.replace(file.basename, h1.heading);
            }
        }
        return text;
    }
    getItems() {
        const { excludeViewTypes, includeSidePanelViewTypes, orderEditorListByAccessTime: orderByAccessTime, } = this.settings;
        return this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes, {
            orderByAccessTime,
        });
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { file, matchType, match } = sugg;
            const hideBasename = [MatchType.None, MatchType.Primary].includes(matchType);
            this.renderAsFileInfoPanel(parentEl, ['qsp-suggestion-editor'], sugg.preferredTitle, file, matchType, match, hideBasename);
            this.renderOptionalIndicators(parentEl, sugg);
            handled = true;
        }
        return handled;
    }
    onChooseSuggestion(sugg, evt) {
        let handled = false;
        if (sugg) {
            this.navigateToLeafOrOpenFile(evt, sugg.file, 'Unable to reopen existing editor in new Leaf.', null, sugg.item, null, true);
            handled = true;
        }
        return handled;
    }
    createSuggestion(currentWorkspaceEnvList, leaf, file, result, preferredTitle) {
        return EditorHandler.createSuggestion(currentWorkspaceEnvList, leaf, file, this.settings, this.app.metadataCache, preferredTitle, result);
    }
    static createSuggestion(currentWorkspaceEnvList, leaf, file, settings, metadataCache, preferredTitle, result) {
        result = result ?? { matchType: MatchType.None, match: null, matchText: null };
        preferredTitle = preferredTitle ?? null;
        let sugg = {
            item: leaf,
            file,
            preferredTitle,
            type: SuggestionType.EditorList,
            ...result,
        };
        sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
        return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
    }
}

const BOOKMARKS_PLUGIN_ID = 'bookmarks';
class BookmarksHandler extends Handler {
    getCommandString(_sessionOpts) {
        return this.settings?.bookmarksListCommand;
    }
    validateCommand(inputInfo, index, filterText, _activeSuggestion, _activeLeaf) {
        const cmd = inputInfo.parsedCommand(Mode.BookmarksList);
        if (this.getEnabledBookmarksPluginInstance()) {
            inputInfo.mode = Mode.BookmarksList;
            cmd.index = index;
            cmd.parsedInput = filterText;
            cmd.isValidated = true;
        }
        return cmd;
    }
    getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            inputInfo.buildSearchQuery();
            const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
            const { allBookmarks } = this.getItems(inputInfo);
            allBookmarks.forEach((info) => {
                let shouldPush = true;
                let result = { matchType: MatchType.None, match: null };
                if (hasSearchTerm) {
                    result = this.fuzzySearchWithFallback(prepQuery, info.bookmarkPath);
                    shouldPush = result.matchType !== MatchType.None;
                }
                if (shouldPush) {
                    suggestions.push(this.createSuggestion(inputInfo.currentWorkspaceEnvList, info, result));
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    renderSuggestion(_sugg, _parentEl) {
        return false;
    }
    onChooseSuggestion(_sugg, _evt) {
        return false;
    }
    getPreferredTitle(pluginInstance, bookmark, file, titleSource) {
        let text = pluginInstance.getItemTitle(bookmark);
        if (titleSource === 'H1' && file) {
            const h1 = this.getFirstH1(file);
            if (h1) {
                // the "#" represents the start of a heading deep link,
                // "#^" represents the the start of a deep block link,
                // so everything before "#" should represent the filename that
                // needs to be replaced with the file title
                text = text.replace(/^[^#]*/, h1.heading);
            }
        }
        return text;
    }
    getItems(inputInfo) {
        const allBookmarks = [];
        const fileBookmarks = new Map();
        const nonFileBookmarks = new Set();
        const pluginInstance = this.getEnabledBookmarksPluginInstance();
        if (pluginInstance) {
            // if inputInfo is not supplied, then all items are expected (disregard facets), so use
            // and empty facet list
            const activeFacetIds = inputInfo
                ? this.getActiveFacetIds(inputInfo)
                : new Set();
            const traverseBookmarks = (bookmarks, path) => {
                bookmarks?.forEach((bookmark) => {
                    if (BookmarksHandler.isBookmarksPluginGroupItem(bookmark)) {
                        traverseBookmarks(bookmark.items, `${path}${bookmark.title}/`);
                    }
                    else if (this.isFacetedWith(activeFacetIds, BOOKMARKS_FACET_ID_MAP[bookmark.type])) {
                        const bookmarkInfo = {
                            item: bookmark,
                            bookmarkPath: null,
                            file: null,
                        };
                        if (BookmarksHandler.isBookmarksPluginFileItem(bookmark)) {
                            const file = this.getTFileByPath(bookmark.path);
                            if (file) {
                                bookmarkInfo.file = file;
                                const infoList = fileBookmarks.get(file) ?? [];
                                infoList.push(bookmarkInfo);
                                fileBookmarks.set(file, infoList);
                            }
                        }
                        else {
                            nonFileBookmarks.add(bookmarkInfo);
                        }
                        const title = this.getPreferredTitle(pluginInstance, bookmark, bookmarkInfo.file, this.settings.preferredSourceForTitle);
                        bookmarkInfo.bookmarkPath = path + title;
                        allBookmarks.push(bookmarkInfo);
                    }
                });
            };
            traverseBookmarks(pluginInstance.items, '');
        }
        return { allBookmarks, fileBookmarks, nonFileBookmarks };
    }
    getEnabledBookmarksPluginInstance() {
        return getInternalEnabledPluginById(this.app, BOOKMARKS_PLUGIN_ID);
    }
    createSuggestion(currentWorkspaceEnvList, bookmarkInfo, result) {
        return BookmarksHandler.createSuggestion(currentWorkspaceEnvList, bookmarkInfo, this.settings, this.app.metadataCache, result);
    }
    static createSuggestion(currentWorkspaceEnvList, bookmarkInfo, settings, metadataCache, result) {
        let sugg = {
            type: SuggestionType.Bookmark,
            item: bookmarkInfo.item,
            bookmarkPath: bookmarkInfo.bookmarkPath,
            file: bookmarkInfo.file,
            ...result,
        };
        sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
        return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
    }
    static isBookmarksPluginFileItem(obj) {
        return isOfType(obj, 'type', 'file');
    }
    static isBookmarksPluginGroupItem(obj) {
        return isOfType(obj, 'type', 'group');
    }
}

class HeadingsHandler extends Handler {
    getCommandString(_sessionOpts) {
        return this.settings?.headingsListCommand;
    }
    validateCommand(inputInfo, index, filterText, _activeSuggestion, _activeLeaf) {
        inputInfo.mode = Mode.HeadingsList;
        const cmd = inputInfo.parsedCommand(Mode.HeadingsList);
        cmd.index = index;
        cmd.parsedInput = filterText;
        cmd.isValidated = true;
        return cmd;
    }
    onChooseSuggestion(sugg, evt) {
        let handled = false;
        if (sugg) {
            const { start: { line, col }, end: endLoc, } = sugg.item.position;
            // state information to highlight the target heading
            const eState = {
                active: true,
                focus: true,
                startLoc: { line, col },
                endLoc,
                line,
                cursor: {
                    from: { line, ch: col },
                    to: { line, ch: col },
                },
            };
            this.navigateToLeafOrOpenFile(evt, sugg.file, 'Unable to navigate to heading for file.', { active: true, eState });
            handled = true;
        }
        return handled;
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { item } = sugg;
            this.addClassesToSuggestionContainer(parentEl, [
                'qsp-suggestion-headings',
                `qsp-headings-l${item.level}`,
            ]);
            const contentEl = this.renderContent(parentEl, item.heading, sugg.match);
            this.renderPath(contentEl, sugg.file);
            // render the flair icons
            const flairContainerEl = this.createFlairContainer(parentEl);
            this.renderOptionalIndicators(parentEl, sugg, flairContainerEl);
            this.renderIndicator(flairContainerEl, ['qsp-headings-indicator'], null, HeadingIndicators[item.level]);
            if (sugg.downranked) {
                parentEl.addClass('mod-downranked');
            }
            handled = true;
        }
        return handled;
    }
    getAvailableFacets(inputInfo) {
        const { settings: { shouldSearchHeadings, shouldSearchBookmarks, shouldSearchFilenames, shouldSearchRecentFiles, builtInSystemOptions: { showAttachments, showAllFileTypes }, }, } = this;
        const externalFilesEnabled = showAttachments || showAllFileTypes;
        // List of facetIds that depend on the corresponding feature being enabled
        const featureEnablementStatus = {
            [HeadingsListFacetIds.RecentFiles]: shouldSearchRecentFiles,
            [HeadingsListFacetIds.Bookmarks]: shouldSearchBookmarks,
            [HeadingsListFacetIds.Filenames]: shouldSearchFilenames,
            [HeadingsListFacetIds.Headings]: shouldSearchHeadings,
            [HeadingsListFacetIds.ExternalFiles]: externalFilesEnabled,
        };
        return this.getFacets(inputInfo.mode).filter((facet) => {
            // If the facetId exists in the feature list, set its availability to the
            // corresponding feature availability
            if (Object.prototype.hasOwnProperty.call(featureEnablementStatus, facet.id)) {
                facet.isAvailable = featureEnablementStatus[facet.id];
            }
            return facet.isAvailable;
        });
    }
    getSuggestions(inputInfo) {
        let suggestions = [];
        if (inputInfo) {
            inputInfo.buildSearchQuery();
            const { hasSearchTerm } = inputInfo.searchQuery;
            const { settings } = this;
            const activeFacetIds = this.getActiveFacetIds(inputInfo);
            const hasActiveFacets = !!activeFacetIds.size;
            if (hasSearchTerm || hasActiveFacets) {
                const { limit } = settings;
                const { app: { vault }, } = this;
                // initialize options
                const options = {
                    headings: settings.shouldSearchHeadings,
                    allHeadings: settings.searchAllHeadings,
                    aliases: settings.shouldShowAlias,
                    bookmarks: settings.shouldSearchBookmarks,
                    filename: settings.shouldSearchFilenames,
                    filenameAsFallback: !settings.strictHeadingsOnly,
                    unresolved: !settings.showExistingOnly,
                };
                this.getItems([vault.getRoot()], inputInfo, suggestions, activeFacetIds, options);
                obsidian.sortSearchResults(suggestions);
                if (limit > 0 && suggestions.length > limit) {
                    suggestions = suggestions.slice(0, limit);
                }
            }
            else {
                this.getSuggestionsForEditorsAndRecentFiles(inputInfo, suggestions, new Set(), { editors: true, recentFiles: settings.shouldSearchRecentFiles });
            }
        }
        return suggestions;
    }
    getItems(files, inputInfo, collection, activeFacetIds, options) {
        const hasActiveFacets = !!activeFacetIds.size;
        // Editors and recent files should only be displayed when there's no search term, or when
        // it's faceted with recentFiles
        const editorAndRecentOptions = { editors: false, recentFiles: false };
        this.getSuggestionsForEditorsAndRecentFiles(inputInfo, collection, activeFacetIds, editorAndRecentOptions);
        // Use the bookmark enabled state to determine whether or not to include them
        const bookmarkOptions = {
            fileBookmarks: options.bookmarks,
            nonFileBookmarks: options.bookmarks,
        };
        this.getSuggestionsForBookmarks(inputInfo, collection, activeFacetIds, bookmarkOptions);
        // Set up options for processing the collections of files
        const fileOptions = {
            headings: options.headings,
            allHeadings: options.allHeadings,
            aliases: options.aliases,
            filename: options.filename,
            filenameAsFallback: options.filenameAsFallback,
        };
        this.getSuggestionForFiles(inputInfo, files, collection, activeFacetIds, fileOptions);
        // Since there's no facet for unresolved, they should never show up when
        // facets are active.
        if (options.unresolved && !hasActiveFacets) {
            this.addUnresolvedSuggestions(collection, inputInfo.searchQuery.prepQuery);
        }
    }
    getSuggestionsForBookmarks(inputInfo, collection, activeFacetIds, options) {
        const hasActiveFacets = activeFacetIds.size;
        const { prepQuery } = inputInfo.searchQuery;
        const { fileBookmarks, nonFileBookmarks } = inputInfo.currentWorkspaceEnvList;
        if (hasActiveFacets) {
            const isBookmarkFacetEnabled = activeFacetIds.has(HeadingsListFacetIds.Bookmarks);
            options = Object.assign(options, {
                fileBookmarks: isBookmarkFacetEnabled,
                nonFileBookmarks: isBookmarkFacetEnabled,
            });
        }
        const processBookmarks = (bookmarkInfoList) => {
            for (const bookmarkInfo of bookmarkInfoList) {
                this.addBookmarkSuggestion(inputInfo, collection, prepQuery, bookmarkInfo);
            }
        };
        if (options.fileBookmarks) {
            fileBookmarks.forEach((bookmarkInfoList) => {
                processBookmarks(bookmarkInfoList);
            });
        }
        if (options.nonFileBookmarks) {
            processBookmarks(nonFileBookmarks);
        }
    }
    getSuggestionForFiles(inputInfo, files, collection, activeFacetIds, options) {
        const hasActiveFacets = !!activeFacetIds.size;
        if (hasActiveFacets) {
            const isHeadingsEnabled = this.isFacetedWith(activeFacetIds, HeadingsListFacetIds.Headings);
            const isExternalFilesEnabled = this.isFacetedWith(activeFacetIds, HeadingsListFacetIds.ExternalFiles);
            // Enable filename when external files facet is active, or, when the Filename
            // facet is active
            const isFilenameEnabled = isExternalFilesEnabled ||
                this.isFacetedWith(activeFacetIds, HeadingsListFacetIds.Filenames);
            let allHeadings = false;
            let filenameAsFallback = false;
            if (isHeadingsEnabled) {
                allHeadings = options.allHeadings === true;
                filenameAsFallback = options.filenameAsFallback === true;
            }
            options = Object.assign(options, {
                headings: isHeadingsEnabled,
                aliases: false,
                filename: isFilenameEnabled,
                allHeadings,
                filenameAsFallback,
            });
        }
        else {
            options = Object.assign({
                headings: true,
                allHeadings: true,
                aliases: true,
                filename: true,
                filenameAsFallback: true,
            }, options);
        }
        // If any of these options are true then every file needs to be processed.
        const shouldProcessFiles = [options.headings, options.aliases, options.filename].some((option) => option === true);
        if (shouldProcessFiles) {
            const { prepQuery } = inputInfo.searchQuery;
            const { excludeFolders } = this.settings;
            const isExcludedFolder = matcherFnForRegExList(excludeFolders);
            let nodes = Array.prototype.concat(files);
            while (nodes.length > 0) {
                const node = nodes.pop();
                if (isTFile(node)) {
                    if (this.shouldIncludeFile(node, activeFacetIds)) {
                        this.addSuggestionsForFile(inputInfo, collection, node, prepQuery, options);
                    }
                }
                else if (!isExcludedFolder(node.path)) {
                    nodes = nodes.concat(node.children);
                }
            }
        }
    }
    addSuggestionsForFile(inputInfo, suggestions, file, prepQuery, options) {
        let isH1Matched = false;
        if (options.headings) {
            isH1Matched = this.addHeadingSuggestions(inputInfo, suggestions, prepQuery, file, options.allHeadings);
        }
        if (options.filename || (!isH1Matched && options.filenameAsFallback)) {
            this.addFileSuggestions(inputInfo, suggestions, prepQuery, file);
        }
        if (options.aliases) {
            this.addAliasSuggestions(inputInfo, suggestions, prepQuery, file);
        }
    }
    shouldIncludeFile(file, activeFacetIds = new Set()) {
        let isIncluded = false;
        if (file) {
            const coreFileExtensions = new Set(['md', 'canvas']);
            const { extension } = file;
            const { app: { viewRegistry, metadataCache }, settings: { excludeObsidianIgnoredFiles, fileExtAllowList, builtInSystemOptions: { showAttachments, showAllFileTypes }, }, } = this;
            const isUserIgnored = excludeObsidianIgnoredFiles && metadataCache.isUserIgnored(file.path);
            if (!isUserIgnored) {
                if (activeFacetIds.has(HeadingsListFacetIds.ExternalFiles)) {
                    const externalFilesEnabled = showAttachments || showAllFileTypes;
                    isIncluded = !coreFileExtensions.has(extension) && externalFilesEnabled;
                }
                else {
                    const isExtAllowed = this.isExternalFileTypeAllowed(file, viewRegistry, showAttachments, showAllFileTypes, fileExtAllowList);
                    isIncluded = isExtAllowed || coreFileExtensions.has(extension);
                }
            }
        }
        return isIncluded;
    }
    isExternalFileTypeAllowed(file, viewRegistry, showAttachments, showAllFileTypes, fileExtAllowList) {
        const { extension } = file;
        let isAllowed = viewRegistry.isExtensionRegistered(extension)
            ? showAttachments
            : showAllFileTypes;
        if (!isAllowed) {
            const allowList = new Set(fileExtAllowList);
            isAllowed = allowList.has(extension);
        }
        return isAllowed;
    }
    addAliasSuggestions(inputInfo, suggestions, prepQuery, file) {
        const { metadataCache } = this.app;
        const frontMatter = metadataCache.getFileCache(file)?.frontmatter;
        if (frontMatter) {
            const aliases = FrontMatterParser.getAliases(frontMatter);
            let i = aliases.length;
            // create suggestions where there is a match with an alias
            while (i--) {
                const alias = aliases[i];
                const { match } = this.fuzzySearchWithFallback(prepQuery, alias);
                if (match) {
                    suggestions.push(this.createAliasSuggestion(inputInfo, alias, file, match));
                }
            }
        }
    }
    addFileSuggestions(inputInfo, suggestions, prepQuery, file) {
        const { match, matchType, matchText } = this.fuzzySearchWithFallback(prepQuery, null, file);
        if (match) {
            suggestions.push(this.createFileSuggestion(inputInfo, file, match, matchType, matchText));
        }
    }
    addBookmarkSuggestion(inputInfo, suggestions, prepQuery, bookmarkInfo) {
        const result = this.fuzzySearchWithFallback(prepQuery, bookmarkInfo.bookmarkPath);
        if (result.match) {
            const sugg = BookmarksHandler.createSuggestion(inputInfo.currentWorkspaceEnvList, bookmarkInfo, this.settings, this.app.metadataCache, result);
            suggestions.push(sugg);
        }
    }
    addHeadingSuggestions(inputInfo, suggestions, prepQuery, file, allHeadings) {
        const { metadataCache } = this.app;
        const headingList = metadataCache.getFileCache(file)?.headings ?? [];
        let h1 = null;
        let isH1Matched = false;
        let i = headingList.length;
        while (i--) {
            const heading = headingList[i];
            let isMatched = false;
            if (allHeadings) {
                isMatched = this.matchAndPushHeading(inputInfo, suggestions, prepQuery, file, heading);
            }
            if (heading.level === 1) {
                const { line } = heading.position.start;
                if (h1 === null || line < h1.position.start.line) {
                    h1 = heading;
                    isH1Matched = isMatched;
                }
            }
        }
        if (!allHeadings && h1) {
            isH1Matched = this.matchAndPushHeading(inputInfo, suggestions, prepQuery, file, h1);
        }
        return isH1Matched;
    }
    matchAndPushHeading(inputInfo, suggestions, prepQuery, file, heading) {
        const { match } = this.fuzzySearchWithFallback(prepQuery, heading.heading);
        if (match) {
            suggestions.push(this.createHeadingSuggestion(inputInfo, heading, file, match));
        }
        return !!match;
    }
    addUnresolvedSuggestions(suggestions, prepQuery) {
        const { metadataCache } = this.app;
        const { unresolvedLinks } = metadataCache;
        const unresolvedSet = new Set();
        const sources = Object.keys(unresolvedLinks);
        let i = sources.length;
        // create a distinct list of unresolved links
        while (i--) {
            // each source has an object with keys that represent the list of unresolved links
            // for that source file
            const sourcePath = sources[i];
            const links = Object.keys(unresolvedLinks[sourcePath]);
            let j = links.length;
            while (j--) {
                // unresolved links can be duplicates, use a Set to get a distinct list
                unresolvedSet.add(links[j]);
            }
        }
        const unresolvedList = Array.from(unresolvedSet);
        i = unresolvedList.length;
        // create suggestions where there is a match with an unresolved link
        while (i--) {
            const unresolved = unresolvedList[i];
            const result = this.fuzzySearchWithFallback(prepQuery, unresolved);
            if (result.matchType !== MatchType.None) {
                suggestions.push(StandardExHandler.createUnresolvedSuggestion(unresolved, result, this.settings, metadataCache));
            }
        }
    }
    createAliasSuggestion(inputInfo, alias, file, match) {
        let sugg = {
            alias,
            file,
            ...this.createSearchMatch(match, MatchType.Primary, alias),
            type: SuggestionType.Alias,
        };
        sugg = Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
        return this.applyMatchPriorityPreferences(sugg);
    }
    createFileSuggestion(inputInfo, file, match, matchType, matchText) {
        let sugg = {
            file,
            match,
            matchType,
            matchText,
            type: SuggestionType.File,
        };
        sugg = Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
        return this.applyMatchPriorityPreferences(sugg);
    }
    createHeadingSuggestion(inputInfo, item, file, match) {
        let sugg = {
            item,
            file,
            ...this.createSearchMatch(match, MatchType.Primary, item.heading),
            type: SuggestionType.HeadingsList,
        };
        sugg = Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
        return this.applyMatchPriorityPreferences(sugg);
    }
    createSearchMatch(match, type, text) {
        let matchType = MatchType.None;
        let matchText = null;
        if (match) {
            matchType = type;
            matchText = text;
        }
        return {
            match,
            matchType,
            matchText,
        };
    }
    addRecentFilesSuggestions(file, inputInfo, prepQuery, collection) {
        const h1 = this.getFirstH1(file);
        const { match, matchType, matchText } = this.fuzzySearchWithFallback(prepQuery, h1?.heading, file);
        if (match) {
            let sugg;
            if (matchType === MatchType.Primary) {
                sugg = this.createHeadingSuggestion(inputInfo, h1, file, match);
            }
            else {
                sugg = this.createFileSuggestion(inputInfo, file, match, matchType, matchText);
            }
            collection.push(sugg);
        }
    }
    addOpenEditorSuggestions(leaf, inputInfo, prepQuery, collection) {
        const file = leaf?.view?.file;
        const { settings, app: { metadataCache }, } = this;
        const preferredTitle = EditorHandler.getPreferredTitle(leaf, settings.preferredSourceForTitle, metadataCache);
        const result = this.fuzzySearchWithFallback(prepQuery, preferredTitle, file);
        if (result.match) {
            const sugg = EditorHandler.createSuggestion(inputInfo.currentWorkspaceEnvList, leaf, file, settings, metadataCache, preferredTitle, result);
            collection.push(sugg);
        }
    }
    getSuggestionsForEditorsAndRecentFiles(inputInfo, collection, activeFacetIds, options) {
        const prepQuery = inputInfo.searchQuery?.prepQuery;
        if (activeFacetIds.has(HeadingsListFacetIds.RecentFiles)) {
            options = Object.assign(options, { editors: false, recentFiles: true });
        }
        else {
            options = Object.assign({ editors: true, recentFiles: true }, options);
        }
        if (options.editors) {
            const leaves = inputInfo.currentWorkspaceEnvList?.openWorkspaceLeaves;
            leaves?.forEach((leaf) => {
                this.addOpenEditorSuggestions(leaf, inputInfo, prepQuery, collection);
            });
        }
        if (options.recentFiles) {
            const files = inputInfo.currentWorkspaceEnvList?.mostRecentFiles;
            files?.forEach((file) => {
                if (this.shouldIncludeFile(file, activeFacetIds)) {
                    this.addRecentFilesSuggestions(file, inputInfo, prepQuery, collection);
                }
            });
        }
    }
    onNoResultsCreateAction(inputInfo, evt) {
        const filename = inputInfo.parsedCommand(Mode.HeadingsList)?.parsedInput;
        this.createFile(filename, evt);
        return true;
    }
}

const CANVAS_ICON_MAP = {
    file: 'lucide-file-text',
    text: 'lucide-sticky-note',
    link: 'lucide-globe',
    group: 'create-group',
};
class SymbolHandler extends Handler {
    getCommandString(sessionOpts) {
        const { settings } = this;
        return sessionOpts?.useActiveEditorAsSource
            ? settings.symbolListActiveEditorCommand
            : settings.symbolListCommand;
    }
    validateCommand(inputInfo, index, filterText, activeSuggestion, activeLeaf) {
        const cmd = inputInfo.parsedCommand(Mode.SymbolList);
        const sourceInfo = this.getSourceInfoForSymbolOperation(activeSuggestion, activeLeaf, index === 0, inputInfo.sessionOpts);
        if (sourceInfo) {
            inputInfo.mode = Mode.SymbolList;
            cmd.source = sourceInfo;
            cmd.index = index;
            cmd.parsedInput = filterText;
            cmd.isValidated = true;
        }
        return cmd;
    }
    async getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            this.inputInfo = inputInfo;
            inputInfo.buildSearchQuery();
            const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
            const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList);
            const items = await this.getItems(symbolCmd.source, hasSearchTerm);
            items.forEach((item) => {
                let shouldPush = true;
                let match = null;
                if (hasSearchTerm) {
                    match = obsidian.fuzzySearch(prepQuery, SymbolHandler.getSuggestionTextForSymbol(item));
                    shouldPush = !!match;
                }
                if (shouldPush) {
                    const { file } = symbolCmd.source;
                    suggestions.push({ type: SuggestionType.SymbolList, file, item, match });
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { item } = sugg;
            const parentElClasses = ['qsp-suggestion-symbol'];
            if (Object.prototype.hasOwnProperty.call(item, 'indentLevel') &&
                this.settings.symbolsInLineOrder &&
                !this.inputInfo?.searchQuery?.hasSearchTerm) {
                parentElClasses.push(`qsp-symbol-l${item.indentLevel}`);
            }
            this.addClassesToSuggestionContainer(parentEl, parentElClasses);
            const text = SymbolHandler.getSuggestionTextForSymbol(item);
            this.renderContent(parentEl, text, sugg.match);
            this.addSymbolIndicator(item, parentEl);
            handled = true;
        }
        return handled;
    }
    onChooseSuggestion(sugg, evt) {
        let handled = false;
        if (sugg) {
            const symbolCmd = this.inputInfo.parsedCommand();
            const { leaf, file } = symbolCmd.source;
            const openState = { active: true };
            const { item } = sugg;
            if (item.symbolType !== SymbolType.CanvasNode) {
                openState.eState = this.constructMDFileNavigationState(item).eState;
            }
            this.navigateToLeafOrOpenFileAsync(evt, file, openState, leaf, Mode.SymbolList).then(() => {
                const { symbol } = item;
                if (SymbolHandler.isCanvasSymbolPayload(item, symbol)) {
                    this.zoomToCanvasNode(this.getActiveLeaf().view, symbol);
                }
            }, (reason) => {
                console.log(`Switcher++: Unable to navigate to symbols for file ${file.path}`, reason);
            });
            handled = true;
        }
        return handled;
    }
    reset() {
        this.inputInfo = null;
    }
    getAvailableFacets(inputInfo) {
        const cmd = inputInfo.parsedCommand(Mode.SymbolList);
        const isCanvasFile = SymbolHandler.isCanvasFile(cmd?.source?.file);
        const facets = this.getFacets(inputInfo.mode);
        const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));
        // get only the string values of SymbolType as they are used as the face ids
        const mdFacetIds = new Set(Object.values(SymbolType).filter((v) => isNaN(Number(v))));
        facets.forEach((facet) => {
            const { id } = facet;
            facet.isAvailable = isCanvasFile ? canvasFacetIds.has(id) : mdFacetIds.has(id);
        });
        return facets.filter((v) => v.isAvailable);
    }
    zoomToCanvasNode(view, nodeData) {
        if (SymbolHandler.isCanvasView(view)) {
            const canvas = view.canvas;
            const node = canvas.nodes.get(nodeData.id);
            canvas.selectOnly(node);
            canvas.zoomToSelection();
        }
    }
    constructMDFileNavigationState(symbolInfo) {
        const { start: { line, col }, end: endLoc, } = symbolInfo.symbol.position;
        // object containing the state information for the target editor,
        // start with the range to highlight in target editor
        return {
            eState: {
                active: true,
                focus: true,
                startLoc: { line, col },
                endLoc,
                line,
                cursor: {
                    from: { line, ch: col },
                    to: { line, ch: col },
                },
            },
        };
    }
    getSourceInfoForSymbolOperation(activeSuggestion, activeLeaf, isSymbolCmdPrefix, sessionOpts) {
        const prevInputInfo = this.inputInfo;
        let prevSourceInfo = null;
        let prevMode = Mode.Standard;
        if (prevInputInfo) {
            prevSourceInfo = prevInputInfo.parsedCommand().source;
            prevMode = prevInputInfo.mode;
        }
        // figure out if the previous operation was a symbol operation
        const hasPrevSymbolSource = prevMode === Mode.SymbolList && !!prevSourceInfo;
        const activeEditorInfo = this.getEditorInfo(activeLeaf);
        const activeSuggInfo = this.getSuggestionInfo(activeSuggestion);
        // Pick the source file for a potential symbol operation, prioritizing
        // any pre-existing symbol operation that was in progress
        let sourceInfo = null;
        if (hasPrevSymbolSource) {
            sourceInfo = prevSourceInfo;
        }
        else if (activeSuggInfo.isValidSource && !sessionOpts.useActiveEditorAsSource) {
            sourceInfo = activeSuggInfo;
        }
        else if (activeEditorInfo.isValidSource && isSymbolCmdPrefix) {
            // Check isSymbolCmdPrefix to prevent the case where an embedded command would
            // trigger this mode for the active editor.
            sourceInfo = activeEditorInfo;
        }
        return sourceInfo;
    }
    async getItems(sourceInfo, hasSearchTerm) {
        let items = [];
        let symbolsInLineOrder = false;
        let selectNearestHeading = false;
        if (!hasSearchTerm) {
            ({ selectNearestHeading, symbolsInLineOrder } = this.settings);
        }
        items = await this.getSymbolsFromSource(sourceInfo, symbolsInLineOrder);
        if (selectNearestHeading) {
            SymbolHandler.FindNearestHeadingSymbol(items, sourceInfo);
        }
        return items;
    }
    static FindNearestHeadingSymbol(items, sourceInfo) {
        const cursorLine = sourceInfo?.cursor?.line;
        // find the nearest heading to the current cursor pos, if applicable
        if (cursorLine) {
            let found = null;
            const headings = items.filter((v) => isHeadingCache(v.symbol));
            if (headings.length) {
                found = headings.reduce((acc, curr) => {
                    const { line: currLine } = curr.symbol.position.start;
                    const accLine = acc ? acc.symbol.position.start.line : -1;
                    return currLine > accLine && currLine <= cursorLine ? curr : acc;
                });
            }
            if (found) {
                found.isSelected = true;
            }
        }
    }
    async getSymbolsFromSource(sourceInfo, orderByLineNumber) {
        const { app: { metadataCache }, inputInfo, } = this;
        const ret = [];
        if (sourceInfo?.file) {
            const { file } = sourceInfo;
            const activeFacetIds = this.getActiveFacetIds(inputInfo);
            if (SymbolHandler.isCanvasFile(file)) {
                await this.addCanvasSymbolsFromSource(file, ret, activeFacetIds);
            }
            else {
                const symbolData = metadataCache.getFileCache(file);
                if (symbolData) {
                    const push = (symbols = [], symbolType) => {
                        if (this.shouldIncludeSymbol(symbolType, activeFacetIds)) {
                            symbols.forEach((symbol) => ret.push({ type: 'symbolInfo', symbol, symbolType }));
                        }
                    };
                    push(symbolData.headings, SymbolType.Heading);
                    push(symbolData.tags, SymbolType.Tag);
                    this.addLinksFromSource(symbolData.links, ret, activeFacetIds);
                    push(symbolData.embeds, SymbolType.Embed);
                    await this.addCalloutsFromSource(file, symbolData.sections?.filter((v) => v.type === 'callout'), ret, activeFacetIds);
                    if (orderByLineNumber) {
                        SymbolHandler.orderSymbolsByLineNumber(ret);
                    }
                }
            }
        }
        return ret;
    }
    shouldIncludeSymbol(symbolType, activeFacetIds) {
        let shouldInclude = false;
        if (typeof symbolType === 'string') {
            shouldInclude = this.isFacetedWith(activeFacetIds, symbolType);
        }
        else {
            shouldInclude =
                this.settings.isSymbolTypeEnabled(symbolType) &&
                    this.isFacetedWith(activeFacetIds, SymbolType[symbolType]);
        }
        return shouldInclude;
    }
    async addCanvasSymbolsFromSource(file, symbolList, activeFacetIds) {
        let canvasNodes;
        try {
            const fileContent = await this.app.vault.cachedRead(file);
            canvasNodes = JSON.parse(fileContent).nodes;
        }
        catch (e) {
            console.log(`Switcher++: error reading file to extract canvas node information. ${file.path} `, e);
        }
        if (Array.isArray(canvasNodes)) {
            canvasNodes.forEach((node) => {
                if (this.shouldIncludeSymbol(CANVAS_NODE_FACET_ID_MAP[node.type], activeFacetIds)) {
                    symbolList.push({
                        type: 'symbolInfo',
                        symbolType: SymbolType.CanvasNode,
                        symbol: { ...node },
                    });
                }
            });
        }
    }
    async addCalloutsFromSource(file, sectionCache, symbolList, activeFacetIds) {
        const { app: { vault }, } = this;
        const shouldInclude = this.shouldIncludeSymbol(SymbolType.Callout, activeFacetIds);
        if (shouldInclude && sectionCache?.length && file) {
            let fileContent = null;
            try {
                fileContent = await vault.cachedRead(file);
            }
            catch (e) {
                console.log(`Switcher++: error reading file to extract callout information. ${file.path} `, e);
            }
            if (fileContent) {
                for (const cache of sectionCache) {
                    const { start, end } = cache.position;
                    const calloutStr = fileContent.slice(start.offset, end.offset);
                    const match = calloutStr.match(/^> \[!([^\]]+)\][+-]?(.*?)(?:\n>|$)/);
                    if (match) {
                        const calloutType = match[1];
                        const calloutTitle = match[match.length - 1];
                        const symbol = {
                            calloutTitle: calloutTitle.trim(),
                            calloutType,
                            ...cache,
                        };
                        symbolList.push({
                            type: 'symbolInfo',
                            symbolType: SymbolType.Callout,
                            symbol,
                        });
                    }
                }
            }
        }
    }
    addLinksFromSource(linkData, symbolList, activeFacetIds) {
        const { settings } = this;
        linkData = linkData ?? [];
        if (this.shouldIncludeSymbol(SymbolType.Link, activeFacetIds)) {
            for (const link of linkData) {
                const type = getLinkType(link);
                const isExcluded = (settings.excludeLinkSubTypes & type) === type;
                if (!isExcluded) {
                    symbolList.push({
                        type: 'symbolInfo',
                        symbol: link,
                        symbolType: SymbolType.Link,
                    });
                }
            }
        }
    }
    static orderSymbolsByLineNumber(symbols) {
        const sorted = symbols.sort((a, b) => {
            const { start: aStart } = a.symbol.position;
            const { start: bStart } = b.symbol.position;
            const lineDiff = aStart.line - bStart.line;
            return lineDiff === 0 ? aStart.col - bStart.col : lineDiff;
        });
        let currIndentLevel = 0;
        sorted.forEach((si) => {
            let indentLevel = 0;
            if (isHeadingCache(si.symbol)) {
                currIndentLevel = si.symbol.level;
                indentLevel = si.symbol.level - 1;
            }
            else {
                indentLevel = currIndentLevel;
            }
            si.indentLevel = indentLevel;
        });
        return sorted;
    }
    static getSuggestionTextForSymbol(symbolInfo) {
        const { symbol } = symbolInfo;
        let text;
        if (isHeadingCache(symbol)) {
            text = symbol.heading;
        }
        else if (isTagCache(symbol)) {
            text = symbol.tag.slice(1);
        }
        else if (isCalloutCache(symbol)) {
            text = symbol.calloutTitle;
        }
        else if (SymbolHandler.isCanvasSymbolPayload(symbolInfo, symbol)) {
            text = SymbolHandler.getSuggestionTextForCanvasNode(symbol);
        }
        else {
            const refCache = symbol;
            ({ link: text } = refCache);
            const { displayText } = refCache;
            if (displayText && displayText !== text) {
                text += `|${displayText}`;
            }
        }
        return text;
    }
    static getSuggestionTextForCanvasNode(node) {
        let text = '';
        const accessors = {
            file: () => node.file,
            text: () => node.text,
            link: () => node.url,
            group: () => node.label,
        };
        const fn = accessors[node?.type];
        if (fn) {
            text = fn();
        }
        return text;
    }
    addSymbolIndicator(symbolInfo, parentEl) {
        const { symbolType, symbol } = symbolInfo;
        const flairElClasses = ['qsp-symbol-indicator'];
        const flairContainerEl = this.createFlairContainer(parentEl);
        if (isCalloutCache(symbol)) {
            flairElClasses.push(...['suggestion-flair', 'callout', 'callout-icon', 'svg-icon']);
            const calloutFlairEl = flairContainerEl.createSpan({
                cls: flairElClasses,
                // Obsidian 0.15.9: the icon glyph is set in css based on the data-callout attr
                attr: { 'data-callout': symbol.calloutType },
            });
            // Obsidian 0.15.9 the --callout-icon css prop holds the name of the icon glyph
            const iconName = calloutFlairEl.getCssPropertyValue('--callout-icon');
            obsidian.setIcon(calloutFlairEl, iconName);
        }
        else if (SymbolHandler.isCanvasSymbolPayload(symbolInfo, symbol)) {
            const icon = CANVAS_ICON_MAP[symbol.type];
            this.renderIndicator(flairContainerEl, flairElClasses, icon, null);
        }
        else {
            let indicator;
            if (isHeadingCache(symbol)) {
                indicator = HeadingIndicators[symbol.level];
            }
            else {
                indicator = SymbolIndicators[symbolType];
            }
            this.renderIndicator(flairContainerEl, flairElClasses, null, indicator);
        }
    }
    static isCanvasSymbolPayload(symbolInfo, payload) {
        return symbolInfo.symbolType === SymbolType.CanvasNode;
    }
    static isCanvasFile(sourceFile) {
        return sourceFile?.extension === 'canvas';
    }
    static isCanvasView(view) {
        return view?.getViewType() === 'canvas';
    }
}

const COMMAND_PALETTE_PLUGIN_ID = 'command-palette';
const RECENTLY_USED_COMMAND_IDS = [];
class CommandHandler extends Handler {
    getCommandString(_sessionOpts) {
        return this.settings?.commandListCommand;
    }
    validateCommand(inputInfo, index, filterText, _activeSuggestion, _activeLeaf) {
        const cmd = inputInfo.parsedCommand(Mode.CommandList);
        if (this.getEnabledCommandPalettePluginInstance()) {
            inputInfo.mode = Mode.CommandList;
            cmd.index = index;
            cmd.parsedInput = filterText;
            cmd.isValidated = true;
        }
        return cmd;
    }
    getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            inputInfo.buildSearchQuery();
            const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
            const itemsInfo = this.getItems(inputInfo, hasSearchTerm);
            itemsInfo.forEach((info) => {
                let shouldPush = true;
                let match = null;
                if (hasSearchTerm) {
                    match = obsidian.fuzzySearch(prepQuery, info.cmd.name);
                    shouldPush = !!match;
                }
                if (shouldPush) {
                    suggestions.push(this.createSuggestion(info, match));
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { item, match, isPinned, isRecent } = sugg;
            this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-command']);
            this.renderContent(parentEl, item.name, match);
            const flairContainerEl = this.createFlairContainer(parentEl);
            this.renderHotkeyForCommand(item.id, this.app, flairContainerEl);
            if (item.icon) {
                this.renderIndicator(flairContainerEl, [], item.icon);
            }
            if (isPinned) {
                this.renderIndicator(flairContainerEl, [], 'filled-pin');
            }
            else if (isRecent) {
                this.renderOptionalIndicators(parentEl, sugg, flairContainerEl);
            }
            handled = true;
        }
        return handled;
    }
    renderHotkeyForCommand(id, app, flairContainerEl) {
        try {
            const { hotkeyManager } = app;
            if (hotkeyManager.getHotkeys(id) || hotkeyManager.getDefaultHotkeys(id)) {
                const hotkeyStr = hotkeyManager.printHotkeyForCommand(id);
                if (hotkeyStr?.length) {
                    flairContainerEl.createEl('kbd', {
                        cls: 'suggestion-hotkey',
                        text: hotkeyStr,
                    });
                }
            }
        }
        catch (err) {
            console.log('Switcher++: error rendering hotkey for command id: ', id, err);
        }
    }
    onChooseSuggestion(sugg) {
        let handled = false;
        if (sugg) {
            const { item } = sugg;
            this.app.commands.executeCommandById(item.id);
            this.saveUsageToList(item.id, RECENTLY_USED_COMMAND_IDS);
            handled = true;
        }
        return handled;
    }
    saveUsageToList(commandId, recentCommandIds) {
        if (recentCommandIds) {
            const oldIndex = recentCommandIds.indexOf(commandId);
            if (oldIndex > -1) {
                recentCommandIds.splice(oldIndex, 1);
            }
            recentCommandIds.unshift(commandId);
            recentCommandIds.splice(25);
        }
    }
    getItems(inputInfo, includeAllCommands) {
        let items = [];
        const activeFacetIds = this.getActiveFacetIds(inputInfo);
        const hasActiveFacets = !!activeFacetIds.size;
        if (hasActiveFacets) {
            items = this.getPinnedAndRecentCommands(activeFacetIds);
        }
        else if (includeAllCommands) {
            items = this.getAllCommands();
        }
        else {
            const pinnedAndRecents = this.getPinnedAndRecentCommands(activeFacetIds);
            items = pinnedAndRecents.length ? pinnedAndRecents : this.getAllCommands();
        }
        return items;
    }
    getPinnedAndRecentCommands(activeFacetIds) {
        const items = [];
        const pinnedIdsSet = this.getPinnedCommandIds();
        const recentIdsSet = this.getRecentCommandIds();
        const findCommandInfo = (id) => {
            let cmdInfo = null;
            const cmd = this.app.commands.findCommand(id);
            if (cmd) {
                cmdInfo = {
                    isPinned: pinnedIdsSet.has(id),
                    isRecent: recentIdsSet.has(id),
                    cmd,
                };
            }
            return cmdInfo;
        };
        const addCommandInfo = (facetId, cmdIds) => {
            if (this.isFacetedWith(activeFacetIds, facetId)) {
                cmdIds.forEach((id) => {
                    const cmdInfo = findCommandInfo(id);
                    if (cmdInfo) {
                        items.push(cmdInfo);
                    }
                });
            }
        };
        addCommandInfo(CommandListFacetIds.Pinned, Array.from(pinnedIdsSet));
        const isPinnedFaceted = this.isFacetedWith(activeFacetIds, CommandListFacetIds.Pinned);
        // Remove any recently used ids that are also in the pinned list so they don't
        // appear twice in the result list when the pinned facet is enabled
        const recentIds = Array.from(recentIdsSet).filter(
        // When not pinned faceted then the recent item should be in the result list
        // but when it is pinned facted, the recent item should only be in the result list
        // when it does not already exist in the pinned list
        (id) => !isPinnedFaceted || (isPinnedFaceted && !pinnedIdsSet.has(id)));
        addCommandInfo(CommandListFacetIds.Recent, recentIds);
        return items;
    }
    getAllCommands() {
        const pinnedIdsSet = this.getPinnedCommandIds();
        const recentIdsSet = this.getRecentCommandIds();
        return this.app.commands
            .listCommands()
            ?.sort((a, b) => a.name.localeCompare(b.name))
            .map((cmd) => {
            return {
                isPinned: pinnedIdsSet.has(cmd.id),
                isRecent: recentIdsSet.has(cmd.id),
                cmd,
            };
        });
    }
    getPinnedCommandIds() {
        const ids = this.getEnabledCommandPalettePluginInstance()?.options?.pinned;
        return new Set(ids ?? []);
    }
    getRecentCommandIds() {
        return new Set(RECENTLY_USED_COMMAND_IDS);
    }
    createSuggestion(commandInfo, match) {
        const { cmd, isPinned, isRecent } = commandInfo;
        const sugg = {
            type: SuggestionType.CommandList,
            item: cmd,
            isPinned,
            isRecent,
            match,
        };
        return this.applyMatchPriorityPreferences(sugg);
    }
    getEnabledCommandPalettePluginInstance() {
        return CommandHandler.getEnabledCommandPalettePluginInstance(this.app);
    }
    static getEnabledCommandPalettePluginInstance(app) {
        return getInternalEnabledPluginById(app, COMMAND_PALETTE_PLUGIN_ID);
    }
}

class RelatedItemsHandler extends Handler {
    getCommandString(sessionOpts) {
        const { settings } = this;
        return sessionOpts?.useActiveEditorAsSource
            ? settings.relatedItemsListActiveEditorCommand
            : settings.relatedItemsListCommand;
    }
    validateCommand(inputInfo, index, filterText, activeSuggestion, activeLeaf) {
        const cmd = inputInfo.parsedCommand(Mode.RelatedItemsList);
        const sourceInfo = this.getSourceInfo(activeSuggestion, activeLeaf, index === 0, inputInfo.sessionOpts);
        if (sourceInfo) {
            inputInfo.mode = Mode.RelatedItemsList;
            cmd.source = sourceInfo;
            cmd.index = index;
            cmd.parsedInput = filterText;
            cmd.isValidated = true;
        }
        return cmd;
    }
    getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            this.inputInfo = inputInfo;
            inputInfo.buildSearchQuery();
            const { hasSearchTerm } = inputInfo.searchQuery;
            const cmd = inputInfo.parsedCommand(Mode.RelatedItemsList);
            const items = this.getItems(cmd.source, inputInfo);
            items.forEach((item) => {
                const sugg = this.searchAndCreateSuggestion(inputInfo, item);
                if (sugg) {
                    suggestions.push(sugg);
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            const { file, matchType, match, item } = sugg;
            const iconMap = new Map([
                [RelationType.Backlink, 'links-coming-in'],
                [RelationType.DiskLocation, 'folder-tree'],
                [RelationType.OutgoingLink, 'links-going-out'],
            ]);
            parentEl.setAttribute('data-relation-type', item.relationType);
            this.renderAsFileInfoPanel(parentEl, ['qsp-suggestion-related'], sugg.preferredTitle, file, matchType, match);
            const flairContainerEl = this.renderOptionalIndicators(parentEl, sugg);
            if (sugg.item.count) {
                // show the count of backlinks
                this.renderIndicator(flairContainerEl, [], null, `${sugg.item.count}`);
            }
            // render the flair icon
            this.renderIndicator(flairContainerEl, ['qsp-related-indicator'], iconMap.get(item.relationType));
            handled = true;
        }
        return handled;
    }
    onChooseSuggestion(sugg, evt) {
        let handled = false;
        if (sugg) {
            const { file } = sugg;
            this.navigateToLeafOrOpenFile(evt, file, `Unable to open related file ${file.path}`);
            handled = true;
        }
        return handled;
    }
    getPreferredTitle(item, preferredSource) {
        let text = null;
        const { file, unresolvedText } = item;
        if (file) {
            if (preferredSource === 'H1') {
                text = this.getFirstH1(file)?.heading ?? null;
            }
        }
        else {
            const isUnresolved = !!unresolvedText?.length;
            if (isUnresolved) {
                text = unresolvedText;
            }
        }
        return text;
    }
    searchAndCreateSuggestion(inputInfo, item) {
        const { file, unresolvedText } = item;
        let result = { matchType: MatchType.None, match: null };
        const isUnresolved = file === null && unresolvedText?.length;
        const { currentWorkspaceEnvList, searchQuery: { hasSearchTerm, prepQuery }, } = inputInfo;
        const { settings, app: { metadataCache }, } = this;
        const preferredTitle = this.getPreferredTitle(item, settings.preferredSourceForTitle);
        if (hasSearchTerm) {
            result = this.fuzzySearchWithFallback(prepQuery, preferredTitle, file);
            if (result.matchType === MatchType.None) {
                return null;
            }
        }
        return isUnresolved
            ? StandardExHandler.createUnresolvedSuggestion(preferredTitle, result, settings, metadataCache)
            : this.createSuggestion(currentWorkspaceEnvList, item, result, preferredTitle);
    }
    getItems(sourceInfo, inputInfo) {
        const relatedItems = [];
        const { metadataCache } = this.app;
        const { file, suggestion } = sourceInfo;
        const enabledRelatedItems = new Set(this.settings.enabledRelatedItems);
        const activeFacetIds = this.getActiveFacetIds(inputInfo);
        const shouldIncludeRelation = (relationType) => {
            return (enabledRelatedItems.has(relationType) &&
                this.isFacetedWith(activeFacetIds, relationType));
        };
        if (shouldIncludeRelation(RelationType.Backlink)) {
            let targetPath = file?.path;
            let linkMap = metadataCache.resolvedLinks;
            if (isUnresolvedSuggestion(suggestion)) {
                targetPath = suggestion.linktext;
                linkMap = metadataCache.unresolvedLinks;
            }
            this.addBacklinks(targetPath, linkMap, relatedItems);
        }
        if (shouldIncludeRelation(RelationType.DiskLocation)) {
            this.addRelatedDiskFiles(file, relatedItems);
        }
        if (shouldIncludeRelation(RelationType.OutgoingLink)) {
            this.addOutgoingLinks(file, relatedItems);
        }
        return relatedItems;
    }
    addRelatedDiskFiles(sourceFile, collection) {
        const { excludeRelatedFolders, excludeOpenRelatedFiles } = this.settings;
        if (sourceFile) {
            const isExcludedFolder = matcherFnForRegExList(excludeRelatedFolders);
            let nodes = [...sourceFile.parent.children];
            while (nodes.length > 0) {
                const node = nodes.pop();
                if (isTFile(node)) {
                    const isSourceFile = node === sourceFile;
                    const isExcluded = isSourceFile ||
                        (excludeOpenRelatedFiles && !!this.findMatchingLeaf(node).leaf);
                    if (!isExcluded) {
                        collection.push({ file: node, relationType: RelationType.DiskLocation });
                    }
                }
                else if (!isExcludedFolder(node.path)) {
                    nodes = nodes.concat(node.children);
                }
            }
        }
    }
    addOutgoingLinks(sourceFile, collection) {
        if (sourceFile) {
            const destUnresolved = new Map();
            const destFiles = new Map();
            const { metadataCache } = this.app;
            const outgoingLinks = metadataCache.getFileCache(sourceFile).links ?? [];
            const incrementCount = (info) => info ? !!(info.count += 1) : false;
            outgoingLinks.forEach((linkCache) => {
                const destPath = linkCache.link;
                const destFile = metadataCache.getFirstLinkpathDest(destPath, sourceFile.path);
                let info;
                if (destFile) {
                    if (!incrementCount(destFiles.get(destFile)) && destFile !== sourceFile) {
                        info = { file: destFile, relationType: RelationType.OutgoingLink, count: 1 };
                        destFiles.set(destFile, info);
                        collection.push(info);
                    }
                }
                else {
                    if (!incrementCount(destUnresolved.get(destPath))) {
                        info = {
                            file: null,
                            relationType: RelationType.OutgoingLink,
                            unresolvedText: destPath,
                            count: 1,
                        };
                        destUnresolved.set(destPath, info);
                        collection.push(info);
                    }
                }
            });
        }
    }
    addBacklinks(targetPath, linkMap, collection) {
        for (const [originFilePath, destPathMap] of Object.entries(linkMap)) {
            if (originFilePath !== targetPath &&
                Object.prototype.hasOwnProperty.call(destPathMap, targetPath)) {
                const count = destPathMap[targetPath];
                const originFile = this.getTFileByPath(originFilePath);
                if (originFile) {
                    collection.push({
                        count,
                        file: originFile,
                        relationType: RelationType.Backlink,
                    });
                }
            }
        }
    }
    reset() {
        this.inputInfo = null;
    }
    getSourceInfo(activeSuggestion, activeLeaf, isPrefixCmd, sessionOpts) {
        const prevInputInfo = this.inputInfo;
        let prevSourceInfo = null;
        let prevMode = Mode.Standard;
        if (prevInputInfo) {
            prevSourceInfo = prevInputInfo.parsedCommand().source;
            prevMode = prevInputInfo.mode;
        }
        // figure out if the previous operation was a symbol operation
        const hasPrevSource = prevMode === Mode.RelatedItemsList && !!prevSourceInfo;
        const activeEditorInfo = this.getEditorInfo(activeLeaf);
        const activeSuggInfo = this.getSuggestionInfo(activeSuggestion);
        if (!activeSuggInfo.isValidSource && isUnresolvedSuggestion(activeSuggestion)) {
            // related items supports retrieving backlinks for unresolved suggestion, so
            // force UnresolvedSuggestion to be valid, even though it would otherwise not be
            activeSuggInfo.isValidSource = true;
        }
        // Pick the source file for the operation, prioritizing
        // any pre-existing operation that was in progress
        let sourceInfo = null;
        if (hasPrevSource) {
            sourceInfo = prevSourceInfo;
        }
        else if (activeSuggInfo.isValidSource && !sessionOpts.useActiveEditorAsSource) {
            sourceInfo = activeSuggInfo;
        }
        else if (activeEditorInfo.isValidSource && isPrefixCmd) {
            sourceInfo = activeEditorInfo;
        }
        return sourceInfo;
    }
    createSuggestion(currentWorkspaceEnvList, item, result, preferredTitle) {
        let sugg = {
            item,
            file: item?.file,
            type: SuggestionType.RelatedItemsList,
            preferredTitle,
            ...result,
        };
        sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
        return this.applyMatchPriorityPreferences(sugg);
    }
}

class VaultHandler extends Handler {
    constructor() {
        super(...arguments);
        this.mobileVaultChooserMarker = {
            type: SuggestionType.VaultList,
            match: null,
            item: null,
            pathSegments: null,
        };
    }
    getCommandString(_sessionOpts) {
        return this.settings?.vaultListCommand;
    }
    validateCommand(inputInfo, index, filterText, _activeSuggestion, _activeLeaf) {
        inputInfo.mode = Mode.VaultList;
        const cmd = inputInfo.parsedCommand(Mode.VaultList);
        cmd.index = index;
        cmd.parsedInput = filterText;
        cmd.isValidated = true;
        return cmd;
    }
    getSuggestions(inputInfo) {
        const suggestions = [];
        if (inputInfo) {
            inputInfo.buildSearchQuery();
            const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
            const items = obsidian.Platform.isDesktop
                ? this.getItems()
                : [this.mobileVaultChooserMarker];
            items.forEach((item) => {
                let shouldPush = true;
                if (hasSearchTerm) {
                    const results = this.fuzzySearchWithFallback(prepQuery, null, item.pathSegments);
                    Object.assign(item, results);
                    shouldPush = !!results.match;
                }
                if (shouldPush) {
                    suggestions.push(item);
                }
            });
            if (hasSearchTerm) {
                obsidian.sortSearchResults(suggestions);
            }
        }
        return suggestions;
    }
    renderSuggestion(sugg, parentEl) {
        let handled = false;
        if (sugg) {
            this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-vault']);
            handled = true;
            if (obsidian.Platform.isDesktop) {
                this.renderVaultSuggestion(sugg, parentEl);
            }
            else if (sugg === this.mobileVaultChooserMarker) {
                this.renderMobileHintSuggestion(parentEl);
            }
        }
        return handled;
    }
    renderMobileHintSuggestion(parentEl) {
        this.renderContent(parentEl, 'Show mobile vault chooser', null);
    }
    renderVaultSuggestion(sugg, parentEl) {
        const { pathSegments, matchType } = sugg;
        let { match } = sugg;
        let basenameMatch = null;
        if (matchType === MatchType.Basename) {
            basenameMatch = match;
            match = null;
        }
        const contentEl = this.renderContent(parentEl, pathSegments.basename, basenameMatch);
        const wrapperEl = contentEl.createDiv({ cls: ['suggestion-note', 'qsp-note'] });
        const iconEl = wrapperEl.createSpan({ cls: ['qsp-path-indicator'] });
        const pathEl = wrapperEl.createSpan({ cls: 'qsp-path' });
        obsidian.setIcon(iconEl, 'folder');
        obsidian.renderResults(pathEl, pathSegments.path, match);
    }
    onChooseSuggestion(sugg, _evt) {
        let handled = false;
        if (sugg) {
            if (obsidian.Platform.isDesktop) {
                // 12/8/23: "vault-open" is the Obsidian defined channel for open a vault
                handled = electron.ipcRenderer.sendSync('vault-open', sugg.pathSegments?.path, false);
            }
            else if (sugg === this.mobileVaultChooserMarker) {
                // It's the mobile app context, show the vault chooser
                this.app.openVaultChooser();
                handled = true;
            }
        }
        return handled;
    }
    getItems() {
        const items = [];
        try {
            // 12/8/23: "vault-list" is the Obsidian defined channel for retrieving
            // the vault list
            const vaultData = electron.ipcRenderer.sendSync('vault-list');
            if (vaultData) {
                for (const [id, { path, open }] of Object.entries(vaultData)) {
                    const basename = filenameFromPath(path);
                    const sugg = {
                        type: SuggestionType.VaultList,
                        match: null,
                        item: id,
                        isOpen: !!open,
                        pathSegments: { basename, path },
                    };
                    items.push(sugg);
                }
            }
        }
        catch (err) {
            console.log('Switcher++: error retrieving list of available vaults. ', err);
        }
        return items.sort((a, b) => a.pathSegments.basename.localeCompare(b.pathSegments.basename));
    }
}

const lastInputInfoByMode = {};
class ModeHandler {
    constructor(app, settings, exKeymap) {
        this.app = app;
        this.settings = settings;
        this.exKeymap = exKeymap;
        this.sessionOpts = {};
        this.noResultActionModes = [Mode.HeadingsList, Mode.WorkspaceList];
        // StandardExHandler one is special in that it is not a "full" handler,
        // and not attached to a mode, as a result it is not in the handlersByMode list
        const standardExHandler = new StandardExHandler(app, settings);
        const handlersByMode = new Map([
            [Mode.SymbolList, new SymbolHandler(app, settings)],
            [Mode.WorkspaceList, new WorkspaceHandler(app, settings)],
            [Mode.HeadingsList, new HeadingsHandler(app, settings)],
            [Mode.EditorList, new EditorHandler(app, settings)],
            [Mode.BookmarksList, new BookmarksHandler(app, settings)],
            [Mode.CommandList, new CommandHandler(app, settings)],
            [Mode.RelatedItemsList, new RelatedItemsHandler(app, settings)],
            [Mode.VaultList, new VaultHandler(app, settings)],
        ]);
        this.handlersByMode = handlersByMode;
        this.handlersByType = new Map([
            [SuggestionType.CommandList, handlersByMode.get(Mode.CommandList)],
            [SuggestionType.EditorList, handlersByMode.get(Mode.EditorList)],
            [SuggestionType.HeadingsList, handlersByMode.get(Mode.HeadingsList)],
            [SuggestionType.RelatedItemsList, handlersByMode.get(Mode.RelatedItemsList)],
            [SuggestionType.Bookmark, handlersByMode.get(Mode.BookmarksList)],
            [SuggestionType.SymbolList, handlersByMode.get(Mode.SymbolList)],
            [SuggestionType.WorkspaceList, handlersByMode.get(Mode.WorkspaceList)],
            [SuggestionType.VaultList, handlersByMode.get(Mode.VaultList)],
            [SuggestionType.File, standardExHandler],
            [SuggestionType.Alias, standardExHandler],
        ]);
        this.handlersByCommand = new Map([
            [settings.editorListCommand, handlersByMode.get(Mode.EditorList)],
            [settings.workspaceListCommand, handlersByMode.get(Mode.WorkspaceList)],
            [settings.headingsListCommand, handlersByMode.get(Mode.HeadingsList)],
            [settings.bookmarksListCommand, handlersByMode.get(Mode.BookmarksList)],
            [settings.commandListCommand, handlersByMode.get(Mode.CommandList)],
            [settings.symbolListCommand, handlersByMode.get(Mode.SymbolList)],
            [settings.symbolListActiveEditorCommand, handlersByMode.get(Mode.SymbolList)],
            [settings.relatedItemsListCommand, handlersByMode.get(Mode.RelatedItemsList)],
            [settings.vaultListCommand, handlersByMode.get(Mode.VaultList)],
            [
                settings.relatedItemsListActiveEditorCommand,
                handlersByMode.get(Mode.RelatedItemsList),
            ],
        ]);
        this.debouncedGetSuggestions = obsidian.debounce(this.getSuggestions.bind(this), settings.headingsSearchDebounceMilli, true);
        this.reset();
    }
    onOpen() {
        const { exKeymap, settings } = this;
        exKeymap.isOpen = true;
        if (settings.quickFilters?.shouldResetActiveFacets) {
            Object.values(settings.quickFilters.facetList).forEach((f) => (f.isActive = false));
        }
    }
    onClose() {
        this.exKeymap.isOpen = false;
    }
    setSessionOpenMode(mode, chooser, sessionOpts) {
        this.reset();
        chooser?.setSuggestions([]);
        if (mode !== Mode.Standard) {
            const openModeString = this.getHandler(mode).getCommandString(sessionOpts);
            Object.assign(this.sessionOpts, sessionOpts, { openModeString });
        }
        if (lastInputInfoByMode[mode]) {
            if ((mode === Mode.CommandList && this.settings.preserveCommandPaletteLastInput) ||
                (mode !== Mode.CommandList && this.settings.preserveQuickSwitcherLastInput)) {
                const lastInfo = lastInputInfoByMode[mode];
                this.lastInput = lastInfo.inputText;
            }
        }
    }
    insertSessionOpenModeOrLastInputString(inputEl) {
        const { sessionOpts, lastInput } = this;
        const openModeString = sessionOpts.openModeString ?? null;
        if (lastInput && lastInput !== openModeString) {
            inputEl.value = lastInput;
            // `openModeString` may `null` when in standard mode
            // otherwise `lastInput` starts with `openModeString`
            const startsNumber = openModeString ? openModeString.length : 0;
            inputEl.setSelectionRange(startsNumber, inputEl.value.length);
        }
        else if (openModeString !== null && openModeString !== '') {
            // update UI with current command string in the case were openInMode was called
            inputEl.value = openModeString;
            // reset to null so user input is not overridden the next time onInput is called
            sessionOpts.openModeString = null;
        }
        // the same logic as `openModeString`
        // make sure it will not override user's normal input.
        this.lastInput = null;
    }
    updateSuggestions(query, chooser, modal) {
        const { exKeymap, settings, sessionOpts } = this;
        let handled = false;
        // cancel any potentially previously running debounced getSuggestions call
        this.debouncedGetSuggestions.cancel();
        // get the currently active leaf across all rootSplits
        const activeLeaf = Handler.getActiveLeaf(this.app.workspace);
        const activeSugg = ModeHandler.getActiveSuggestion(chooser);
        const inputInfo = this.determineRunMode(query, activeSugg, activeLeaf, sessionOpts);
        this.inputInfo = inputInfo;
        const { mode } = inputInfo;
        lastInputInfoByMode[mode] = inputInfo;
        this.updatedKeymapForMode(inputInfo, chooser, modal, exKeymap, settings, activeLeaf);
        this.toggleMobileCreateFileButton(modal, mode, settings);
        if (mode !== Mode.Standard) {
            if (mode === Mode.HeadingsList && inputInfo.parsedCommand().parsedInput?.length) {
                // if headings mode and user is typing a query, delay getting suggestions
                this.debouncedGetSuggestions(inputInfo, chooser, modal);
            }
            else {
                this.getSuggestions(inputInfo, chooser, modal);
            }
            handled = true;
        }
        return handled;
    }
    /**
     * Sets the allowCreateNewFile property of the modal based on config settings and mode
     * @param  {SwitcherPlus} modal
     * @param  {Mode} mode
     * @param  {SwitcherPlusSettings} config
     * @returns void
     */
    toggleMobileCreateFileButton(modal, mode, config) {
        if (!obsidian.Platform.isMobile) {
            return;
        }
        const modeName = Mode[mode];
        modal.allowCreateNewFile = config.allowCreateNewFileInModeNames.includes(modeName);
        if (!modal.allowCreateNewFile) {
            // If file creation is disabled, remove the button from the DOM.
            // Note that when enabled, the core switcher will add automatically add
            // createButtonEl back to the DOM.
            modal.createButtonEl?.detach();
        }
    }
    updatedKeymapForMode(inputInfo, chooser, modal, exKeymap, settings, activeLeaf) {
        const { mode } = inputInfo;
        const handler = this.getHandler(mode);
        const facetList = handler?.getAvailableFacets(inputInfo) ?? [];
        const handleFacetKeyEvent = (facets, isReset) => {
            if (isReset) {
                // cycle between making all facets active/inactive
                const hasActive = facets.some((v) => v.isActive === true);
                handler.activateFacet(facets, !hasActive);
            }
            else {
                // expect facets to contain only one item that needs to be toggled
                handler.activateFacet(facets, !facets[0].isActive);
            }
            // refresh the suggestion list after changing the list of active facets
            this.updatedKeymapForMode(inputInfo, chooser, modal, exKeymap, settings, activeLeaf);
            this.getSuggestions(inputInfo, chooser, modal);
            // prevent default handling of key press afterwards
            return false;
        };
        const keymapConfig = {
            mode,
            activeLeaf,
            facets: {
                facetList,
                facetSettings: settings.quickFilters,
                onToggleFacet: handleFacetKeyEvent.bind(this),
            },
        };
        exKeymap.updateKeymapForMode(keymapConfig);
    }
    renderSuggestion(sugg, parentEl) {
        const { inputInfo, settings: { overrideStandardModeBehaviors }, } = this;
        const { mode } = inputInfo;
        const isHeadingMode = mode === Mode.HeadingsList;
        let handled = false;
        const systemBehaviorPreferred = new Set([
            SuggestionType.Unresolved,
            SuggestionType.Bookmark,
        ]);
        if (sugg === null) {
            if (isHeadingMode) {
                // in Headings mode, a null suggestion should be rendered to allow for note creation
                const headingHandler = this.getHandler(mode);
                const searchText = inputInfo.parsedCommand(mode)?.parsedInput;
                headingHandler.renderFileCreationSuggestion(parentEl, searchText);
                handled = true;
            }
        }
        else if (!systemBehaviorPreferred.has(sugg.type)) {
            if (overrideStandardModeBehaviors || isHeadingMode || isExSuggestion(sugg)) {
                // when overriding standard mode, or, in Headings mode, StandardExHandler should
                // handle rendering for FileSuggestion and Alias suggestion
                const handler = this.getHandler(sugg);
                if (handler) {
                    if (mode === Mode.Standard) {
                        // suggestions in standard mode are created by core Obsidian and are
                        // missing some properties, try to add them
                        handler.addPropertiesToStandardSuggestions(inputInfo, sugg);
                    }
                    handled = handler.renderSuggestion(sugg, parentEl);
                }
            }
        }
        return handled;
    }
    onChooseSuggestion(sugg, evt) {
        const { inputInfo, settings: { overrideStandardModeBehaviors }, } = this;
        const { mode } = inputInfo;
        const isHeadingMode = mode === Mode.HeadingsList;
        let handled = false;
        const systemBehaviorPreferred = new Set([
            SuggestionType.Unresolved,
            SuggestionType.Bookmark,
        ]);
        if (sugg === null) {
            if (this.noResultActionModes.includes(mode)) {
                // In these modes, a null suggestion indicates that
                // the <enter to create> UI action was chosen
                const handler = this.getHandler(mode);
                handled = !!handler?.onNoResultsCreateAction(inputInfo, evt);
            }
        }
        else if (!systemBehaviorPreferred.has(sugg.type)) {
            if (overrideStandardModeBehaviors || isHeadingMode || isExSuggestion(sugg)) {
                // when overriding standard mode, or, in Headings mode, StandardExHandler should
                // handle the onChoose action for File and Alias suggestion so that
                // the preferOpenInNewPane setting can be handled properly
                const handler = this.getHandler(sugg);
                if (handler) {
                    handled = handler.onChooseSuggestion(sugg, evt);
                }
            }
        }
        return handled;
    }
    determineRunMode(query, activeSugg, activeLeaf, sessionOpts) {
        const input = query ?? '';
        const info = new InputInfo(input, Mode.Standard, sessionOpts);
        this.addWorkspaceEnvLists(info);
        if (input.length === 0) {
            this.reset();
        }
        this.validatePrefixCommands(info, activeSugg, activeLeaf, this.settings);
        return info;
    }
    getSuggestions(inputInfo, chooser, modal) {
        chooser.setSuggestions([]);
        const { mode } = inputInfo;
        const suggestions = this.getHandler(mode).getSuggestions(inputInfo);
        const setSuggestions = (suggs) => {
            if (suggs?.length) {
                chooser.setSuggestions(suggs);
                ModeHandler.setActiveSuggestion(mode, chooser);
            }
            else {
                if (this.noResultActionModes.includes(mode) &&
                    inputInfo.parsedCommand(mode).parsedInput) {
                    modal.onNoSuggestion();
                }
                else {
                    chooser.setSuggestions(null);
                }
            }
        };
        if (Array.isArray(suggestions)) {
            setSuggestions(suggestions);
        }
        else {
            suggestions.then((values) => {
                setSuggestions(values);
            }, (reason) => {
                console.log('Switcher++: error retrieving suggestions as Promise. ', reason);
            });
        }
    }
    removeEscapeCommandCharFromInput(inputInfo, escapeCmdChar, cmdStr) {
        const sansEscapeInput = inputInfo.inputTextSansEscapeChar.replace(new RegExp(`(?:${escapeRegExp(escapeCmdChar)})(?:${escapeRegExp(cmdStr)})`), cmdStr);
        inputInfo.inputTextSansEscapeChar = sansEscapeInput;
        return sansEscapeInput;
    }
    validatePrefixCommands(inputInfo, activeSugg, activeLeaf, config) {
        let cmdStr = null;
        let handler = null;
        const activeEditorCmds = [
            config.symbolListActiveEditorCommand,
            config.relatedItemsListActiveEditorCommand,
        ];
        const prefixCmds = [
            config.editorListCommand,
            config.workspaceListCommand,
            config.headingsListCommand,
            config.bookmarksListCommand,
            config.commandListCommand,
            config.vaultListCommand,
        ]
            .concat(activeEditorCmds)
            .map((v) => `(?:${escapeRegExp(v)})`)
            // account for potential overlapping command strings
            .sort((a, b) => b.length - a.length);
        // regex that matches any of the prefix commands
        const match = new RegExp(`^((?:${escapeRegExp(config.escapeCmdChar)})?)(${prefixCmds.join('|')})`).exec(inputInfo.inputText);
        if (match) {
            const containsNegation = !!match[1].length;
            cmdStr = match[2];
            if (containsNegation) {
                this.removeEscapeCommandCharFromInput(inputInfo, config.escapeCmdChar, cmdStr);
                cmdStr = null;
            }
            else {
                handler = this.getHandler(cmdStr);
            }
        }
        const isValidated = this.validateSourcedCommands(inputInfo, cmdStr, activeSugg, activeLeaf, config);
        if (!isValidated && handler) {
            inputInfo.sessionOpts.useActiveEditorAsSource = activeEditorCmds.includes(cmdStr);
            const filterText = inputInfo.inputTextSansEscapeChar.slice(cmdStr.length);
            handler.validateCommand(inputInfo, match.index, filterText, activeSugg, activeLeaf);
        }
    }
    validateSourcedCommands(inputInfo, parsedPrefixCmd, activeSugg, activeLeaf, config) {
        let isValidated = false;
        const unmatchedHandlers = [];
        const searchText = inputInfo.inputTextSansEscapeChar;
        // Headings, Bookmarks, and EditorList mode can have an embedded command
        const supportedModes = [
            config.editorListCommand,
            config.headingsListCommand,
            config.bookmarksListCommand,
        ];
        // A falsy parsedPrefixCmd indicates Standard mode since no prefix command was matched
        if (!parsedPrefixCmd || supportedModes.includes(parsedPrefixCmd)) {
            let match = null;
            const sourcedCmds = [config.symbolListCommand, config.relatedItemsListCommand]
                .map((v) => `(?:${escapeRegExp(v)})`)
                .sort((a, b) => b.length - a.length);
            const re = new RegExp(`((?:${escapeRegExp(config.escapeCmdChar)})?)(${sourcedCmds.join('|')})`, 'g');
            while ((match = re.exec(searchText)) !== null) {
                const containsNegation = !!match[1].length;
                const cmdStr = match[2];
                if (containsNegation) {
                    this.removeEscapeCommandCharFromInput(inputInfo, config.escapeCmdChar, cmdStr);
                }
                else {
                    const filterText = searchText.slice(re.lastIndex);
                    const handler = this.getHandler(cmdStr);
                    if (handler) {
                        const cmd = handler.validateCommand(inputInfo, match.index, filterText, activeSugg, activeLeaf);
                        isValidated = !!cmd?.isValidated;
                        // Find all sourced handlers that did not match
                        const unmatched = this.getSourcedHandlers().filter((v) => v !== handler);
                        unmatchedHandlers.push(...unmatched);
                    }
                    break;
                }
            }
        }
        // if unmatchedHandlers has items then there was a match, so reset all others
        // otherwise reset all sourced handlers
        this.resetSourcedHandlers(unmatchedHandlers.length ? unmatchedHandlers : null);
        return isValidated;
    }
    static setActiveSuggestion(mode, chooser) {
        // only symbol mode currently sets an active selection
        if (mode === Mode.SymbolList) {
            const index = chooser.values
                .filter((v) => isSymbolSuggestion(v))
                .findIndex((v) => v.item.isSelected);
            if (index !== -1) {
                chooser.setSelectedItem(index, null);
                chooser.suggestions[chooser.selectedItem].scrollIntoView(false);
            }
        }
    }
    static getActiveSuggestion(chooser) {
        let activeSuggestion = null;
        if (chooser?.values) {
            activeSuggestion = chooser.values[chooser.selectedItem];
        }
        return activeSuggestion;
    }
    reset() {
        this.inputInfo = new InputInfo();
        this.sessionOpts = {};
        this.resetSourcedHandlers();
    }
    resetSourcedHandlers(handlers) {
        handlers = handlers ?? this.getSourcedHandlers();
        handlers.forEach((handler) => handler?.reset());
    }
    getSourcedHandlers() {
        const sourcedModes = [Mode.RelatedItemsList, Mode.SymbolList];
        return sourcedModes.map((v) => this.getHandler(v));
    }
    addWorkspaceEnvLists(inputInfo) {
        if (inputInfo) {
            const openEditors = this.getHandler(Mode.EditorList).getItems();
            // Create a Set containing the files from all the open editors
            const openEditorFilesSet = openEditors
                .map((leaf) => leaf?.view?.file)
                .filter((file) => !!file)
                .reduce((collection, file) => collection.add(file), new Set());
            // Get the list of bookmarks split into file bookmarks and non-file bookmarks
            const { fileBookmarks, nonFileBookmarks } = this.getHandler(Mode.BookmarksList).getItems(null);
            const lists = inputInfo.currentWorkspaceEnvList;
            lists.openWorkspaceLeaves = new Set(openEditors);
            lists.openWorkspaceFiles = openEditorFilesSet;
            lists.fileBookmarks = fileBookmarks;
            lists.nonFileBookmarks = nonFileBookmarks;
            lists.attachmentFileExtensions = this.getAttachmentFileExtensions(this.app.viewRegistry, this.settings.fileExtAllowList);
            // Get the list of recently closed files excluding the currently open ones
            const maxCount = openEditorFilesSet.size + this.settings.maxRecentFileSuggestionsOnInit;
            lists.mostRecentFiles = this.getRecentFiles(openEditorFilesSet, maxCount);
        }
        return inputInfo;
    }
    getAttachmentFileExtensions(viewRegistry, exemptFileExtensions) {
        const extList = new Set();
        try {
            const coreExts = new Set(['md', 'canvas', ...exemptFileExtensions]);
            // Add the list of registered extensions to extList, excluding the markdown and canvas
            Object.keys(viewRegistry.typeByExtension).reduce((collection, ext) => {
                if (!coreExts.has(ext)) {
                    collection.add(ext);
                }
                return collection;
            }, extList);
        }
        catch (err) {
            console.log('Switcher++: error retrieving attachment list from ViewRegistry', err);
        }
        return extList;
    }
    getRecentFiles(ignoreFiles, maxCount = 75) {
        ignoreFiles = ignoreFiles ?? new Set();
        const recentFiles = new Set();
        if (maxCount > 0) {
            const { workspace, vault } = this.app;
            const recentFilePaths = workspace.getRecentFiles({
                showMarkdown: true,
                showCanvas: true,
                showNonImageAttachments: true,
                showImages: true,
                maxCount,
            });
            recentFilePaths?.forEach((path) => {
                const file = vault.getAbstractFileByPath(path);
                if (isTFile(file) && !ignoreFiles.has(file)) {
                    recentFiles.add(file);
                }
            });
        }
        return recentFiles;
    }
    inputTextForStandardMode(input) {
        const { mode, inputTextSansEscapeChar } = this.inputInfo;
        let searchText = input;
        if (mode === Mode.Standard && inputTextSansEscapeChar?.length) {
            searchText = inputTextSansEscapeChar;
        }
        return searchText;
    }
    getHandler(kind) {
        let handler;
        const { handlersByMode, handlersByType, handlersByCommand } = this;
        if (typeof kind === 'number') {
            handler = handlersByMode.get(kind);
        }
        else if (isOfType(kind, 'type')) {
            handler = handlersByType.get(kind.type);
        }
        else if (typeof kind === 'string') {
            handler = handlersByCommand.get(kind);
        }
        return handler;
    }
}

const MOD_KEY = obsidian.Platform.isMacOS ? 'Meta' : 'Ctrl';
class SwitcherPlusKeymap {
    get isOpen() {
        return this._isOpen;
    }
    set isOpen(value) {
        this._isOpen = value;
    }
    constructor(app, scope, chooser, modal, config) {
        this.app = app;
        this.scope = scope;
        this.chooser = chooser;
        this.modal = modal;
        this.config = config;
        this.standardKeysInfo = [];
        this.customKeysInfo = [];
        this.savedStandardKeysInfo = [];
        this.customInstructionEls = new Map();
        this.facetKeysInfo = [];
        this.insertIntoEditorKeysInfo = [];
        this.modifierToPlatformStrMap = {
            Mod: 'Ctrl',
            Ctrl: 'Ctrl',
            Meta: 'Win',
            Alt: 'Alt',
            Shift: 'Shift',
        };
        if (obsidian.Platform.isMacOS) {
            this.modifierToPlatformStrMap = {
                Mod: '⌘',
                Ctrl: '⌃',
                Meta: '⌘',
                Alt: '⌥',
                Shift: '⇧',
            };
        }
        this.initKeysInfo();
        this.bindNavigateToCommandHotkeySelector(this.customKeysInfo, config);
        this.bindTogglePinnedCommand(this.customKeysInfo, config);
        this.removeDefaultTabKeyBinding(scope, config);
        this.registerNavigationBindings(scope, config.navigationKeys);
        this.registerEditorTabBindings(scope);
        this.registerCloseWhenEmptyBindings(scope, config);
        this.renderModeTriggerInstructions(modal.modalEl, config);
        this.standardInstructionsEl =
            modal.modalEl.querySelector('.prompt-instructions');
    }
    initKeysInfo() {
        const customFileBasedModes = [
            Mode.EditorList,
            Mode.HeadingsList,
            Mode.RelatedItemsList,
            Mode.BookmarksList,
            Mode.SymbolList,
        ];
        // standard mode keys that are registered by default, and
        // should be unregistered in custom modes, then re-registered in standard mode.
        // Note: these won't have the eventListener when they are defined here, since
        // the listener is registered by core Obsidian.
        const standardKeysInfo = [];
        // custom mode keys that should be registered, then unregistered in standard mode
        // Note: modifiers should be a comma separated string of Modifiers
        // without any padding space characters
        const customKeysInfo = [
            {
                isInstructionOnly: true,
                modes: customFileBasedModes,
                modifiers: null,
                key: null,
                command: this.commandDisplayStr(['Mod'], '↵'),
                purpose: 'open in new tab',
            },
            {
                isInstructionOnly: true,
                modes: customFileBasedModes,
                modifiers: null,
                key: null,
                command: this.commandDisplayStr(['Mod'], '\\'),
                purpose: 'open to the right',
            },
            {
                isInstructionOnly: true,
                modes: customFileBasedModes,
                modifiers: null,
                key: null,
                command: this.commandDisplayStr(['Mod', 'Shift'], '\\'),
                purpose: 'open below',
            },
            {
                isInstructionOnly: true,
                modes: customFileBasedModes,
                modifiers: null,
                key: null,
                command: this.commandDisplayStr(['Mod'], 'o'),
                purpose: 'open in new window',
            },
            {
                isInstructionOnly: true,
                modes: [Mode.CommandList],
                modifiers: null,
                key: null,
                command: `↵`,
                purpose: 'execute command',
            },
            {
                isInstructionOnly: true,
                modes: [Mode.WorkspaceList],
                modifiers: null,
                key: null,
                command: `↵`,
                purpose: 'open workspace',
            },
        ];
        this.standardKeysInfo.push(...standardKeysInfo);
        this.customKeysInfo.push(...customKeysInfo);
    }
    /**
     * Adds the configured key combination for launching the Obsidian hotkey selection
     * dialog to customKeysInfo
     *
     * @param {CustomKeymapInfo[]} customKeysInfo
     * @param {SwitcherPlusSettings} config
     */
    bindNavigateToCommandHotkeySelector(customKeysInfo, config) {
        const { navigateToHotkeySelectorKeys: { modifiers, key }, } = config;
        const hotkeySelectorNavKeymap = {
            modes: [Mode.CommandList],
            purpose: 'set hotkey',
            eventListener: this.navigateToCommandHotkeySelector.bind(this),
            command: this.commandDisplayStr(modifiers, key),
            modifiers: modifiers,
            key,
        };
        customKeysInfo.push(hotkeySelectorNavKeymap);
    }
    /**
     * Adds the configured key combination to pin/unpin Commands to customKeysInfo
     *
     * @param {CustomKeymapInfo[]} customKeysInfo
     * @param {SwitcherPlusSettings} config
     */
    bindTogglePinnedCommand(customKeysInfo, config) {
        const { togglePinnedCommandKeys: { modifiers, key }, } = config;
        const togglePinnedKeymap = {
            modes: [Mode.CommandList],
            purpose: 'toggle pinned',
            eventListener: this.togglePinnedCommand.bind(this),
            command: this.commandDisplayStr(modifiers, key),
            modifiers: modifiers,
            key,
        };
        customKeysInfo.push(togglePinnedKeymap);
    }
    removeDefaultTabKeyBinding(scope, config) {
        if (config?.removeDefaultTabBinding) {
            // 07/04/2023: Obsidian registers a binding for Tab key that only returns false
            // remove this binding so Tab can be remapped
            const keymap = scope.keys.find(({ modifiers, key }) => modifiers === null && key === 'Tab');
            scope.unregister(keymap);
        }
    }
    registerNavigationBindings(scope, navConfig) {
        const regKeys = (keys, isNext) => {
            keys.forEach(({ modifiers, key }) => {
                scope.register(modifiers, key, (evt, _ctx) => {
                    this.navigateItems(evt, isNext);
                    return false;
                });
            });
        };
        regKeys(navConfig?.nextKeys ?? [], true);
        regKeys(navConfig?.prevKeys ?? [], false);
    }
    registerFacetBinding(scope, keymapConfig) {
        const { mode, facets } = keymapConfig;
        if (facets?.facetList?.length) {
            const { facetList, facetSettings, onToggleFacet } = facets;
            const { keyList, modifiers, resetKey, resetModifiers } = facetSettings;
            let currKeyListIndex = 0;
            const registerFn = (modKeys, key, facetListLocal, isReset) => {
                return scope.register(modKeys, key, () => onToggleFacet(facetListLocal, isReset));
            };
            // register each of the facets to a corresponding key
            for (let i = 0; i < facetList.length; i++) {
                const facet = facetList[i];
                const facetModifiers = facet.modifiers ?? modifiers;
                let key;
                if (facet.key?.length) {
                    // has override key defined so use it instead of the default
                    key = facet.key;
                }
                else if (currKeyListIndex < keyList.length) {
                    // use up one of the default keys
                    key = keyList[currKeyListIndex];
                    ++currKeyListIndex;
                }
                else {
                    // override key is not defined and no default keys left
                    console.log(`Switcher++: unable to register hotkey for facet: ${facet.label} in mode: ${Mode[mode]} because a trigger key is not specified`);
                    continue;
                }
                registerFn(facetModifiers, key, [facet], false);
                this.facetKeysInfo.push({
                    facet,
                    command: key,
                    purpose: facet.label,
                    modifiers: facetModifiers,
                    key,
                });
            }
            // register the toggle key
            const resetMods = resetModifiers ?? modifiers;
            registerFn(resetMods, resetKey, facetList, true);
            this.facetKeysInfo.push({
                facet: null,
                command: resetKey,
                purpose: 'toggle all',
                modifiers: resetMods,
                key: resetKey,
            });
        }
    }
    registerEditorTabBindings(scope) {
        const keys = [
            [[MOD_KEY], '\\'],
            [[MOD_KEY, 'Shift'], '\\'],
            [[MOD_KEY], 'o'],
        ];
        keys.forEach((v) => {
            scope.register(v[0], v[1], this.useSelectedItem.bind(this));
        });
    }
    registerCloseWhenEmptyBindings(scope, config) {
        const keymaps = config.closeWhenEmptyKeys;
        keymaps?.forEach(({ modifiers, key }) => {
            scope.register(modifiers, key, this.closeModalIfEmpty.bind(this));
        });
    }
    updateInsertIntoEditorCommand(mode, activeEditor, customKeysInfo, insertConfig) {
        const { isEnabled, keymap, insertableEditorTypes } = insertConfig;
        let keyInfo = null;
        if (isEnabled) {
            const excludedModes = [Mode.CommandList, Mode.WorkspaceList, Mode.VaultList];
            const activeViewType = activeEditor?.view?.getViewType();
            const isExcluded = (activeViewType && !insertableEditorTypes.includes(activeViewType)) ||
                excludedModes.includes(mode);
            if (!isExcluded) {
                keyInfo = customKeysInfo.find((v) => v.purpose === keymap.purpose);
                if (!keyInfo) {
                    const { modifiers, key, purpose } = keymap;
                    keyInfo = {
                        isInstructionOnly: false,
                        command: this.commandDisplayStr(modifiers, key),
                        modifiers,
                        key,
                        purpose,
                    };
                    customKeysInfo.push(keyInfo);
                }
                // update the handler to capture the active editor
                keyInfo.eventListener = () => {
                    const { modal, chooser } = this;
                    modal.close();
                    const item = chooser.values?.[chooser.selectedItem];
                    this.insertIntoEditorAsLink(item, activeEditor, insertConfig);
                    return false;
                };
                keyInfo.modes = [mode];
            }
        }
        return keyInfo;
    }
    updateKeymapForMode(keymapConfig) {
        const { mode, activeLeaf } = keymapConfig;
        const { modal, scope, customKeysInfo, facetKeysInfo, standardKeysInfo, savedStandardKeysInfo, config: { insertLinkInEditor, showModeTriggerInstructions }, } = this;
        this.updateInsertIntoEditorCommand(mode, activeLeaf, customKeysInfo, insertLinkInEditor);
        // Unregister all custom keys that was previously registered
        const customKeymaps = customKeysInfo.filter((v) => !v.isInstructionOnly);
        this.unregisterKeys(scope, customKeymaps);
        // Remove facet keys and reset storage array
        this.unregisterKeys(scope, facetKeysInfo);
        facetKeysInfo.length = 0;
        // Filter to just the list of custom keys that should be
        // registered in the current mode
        const customKeysToAdd = customKeymaps.filter((v) => v.modes?.includes(mode));
        if (mode === Mode.Standard) {
            this.updateKeymapForStandardMode(scope, customKeysToAdd, savedStandardKeysInfo);
        }
        else {
            this.updateKeymapForCustomModes(scope, customKeysToAdd, standardKeysInfo, keymapConfig, modal);
        }
        this.showModeTriggerInstructions(modal.modalEl, showModeTriggerInstructions);
    }
    /**
     * Re-register the standard mode keys that were previously unregistered, if any.
     * And enables displaying the standard prompt instructions
     *
     * @param {Scope} scope
     * @param {CustomKeymapInfo[]} customKeysToAdd Array of custom keymaps that should be registered
     * @param {Array<[CustomKeymapInfo, KeymapEventHandler]>} savedStandardKeysInfo Event
     * handler info for standard keys that were previously unregistered
     */
    updateKeymapForStandardMode(scope, customKeysToAdd, savedStandardKeysInfo) {
        // Merge the properties from the saved tuple into an object that can be used
        // for re-registering. This is because access to the listener is only available after
        // a standard keymap has already been unregistered.
        const reregisterKeymaps = savedStandardKeysInfo.map(([keymap, eventHandler]) => {
            return {
                eventListener: eventHandler.func,
                ...keymap,
            };
        });
        // Register the standard keys again
        this.registerKeys(scope, reregisterKeymaps);
        savedStandardKeysInfo.length = 0;
        // after (re)registering the standard keys, register any custom keys that
        // should also work in standard mode
        this.registerKeys(scope, customKeysToAdd);
        this.toggleStandardInstructions(true);
    }
    /**
     * Unregisters the standard mode keys, registers the custom keys and displays
     * the custom prompt instructions
     *
     * @param {Scope} scope
     * @param {CustomKeymapInfo[]} customKeysToAdd Array of custom keymaps that should be registered
     * @param {CustomKeymapInfo[]} standardKeysInfo Array of standard keymaps that should be unregistered
     * @param {KeymapConfig} keymapConfig
     * @param {SwitcherPlus} modal
     */
    updateKeymapForCustomModes(scope, customKeysToAdd, standardKeysInfo, keymapConfig, modal) {
        const { savedStandardKeysInfo, customKeysInfo, facetKeysInfo } = this;
        // Unregister the standard keys and save them so they can be registered
        // again later
        const standardKeysRemoved = this.unregisterKeys(scope, standardKeysInfo);
        if (standardKeysRemoved.length) {
            savedStandardKeysInfo.push(...standardKeysRemoved);
        }
        this.registerKeys(scope, customKeysToAdd);
        this.registerFacetBinding(scope, keymapConfig);
        this.showCustomInstructions(modal, keymapConfig, customKeysInfo, facetKeysInfo);
    }
    /**
     * Registers keymaps using the provided scope.
     *
     * @param {Scope} scope
     * @param {CustomKeymapInfo[]} keymaps
     */
    registerKeys(scope, keymaps) {
        keymaps.forEach(({ modifiers, key, eventListener }) => {
            scope.register(modifiers, key, eventListener);
        });
    }
    /**
     * Finds each keymap in Scope.keys and unregisters the associated KeymapEventHandler
     *
     * @param {Scope} scope
     * @param {CustomKeymapInfo[]} keymaps the keymaps to remove
     * @returns {Array<[CustomKeymapInfo, KeymapEventHandler]>} An array of tuples containing the keymap removed and the associated KeymapEventHandler that was unregistered.
     */
    unregisterKeys(scope, keymaps) {
        const removedEventHandlers = [];
        // Map the keymaps to remove into an object that looks like:
        // { key: { modifiers1: keymap, modifiers2: keymap } }
        const keymapsByKey = {};
        keymaps.map((keymap) => {
            const { key, modifiers } = keymap;
            const modifierStr = SwitcherPlusKeymap.modifiersToKeymapInfoStr(modifiers);
            const modifierList = keymapsByKey[key];
            if (modifierList) {
                modifierList[modifierStr] = keymap;
            }
            else {
                keymapsByKey[key] = { [modifierStr]: keymap };
            }
        });
        let i = scope.keys.length;
        while (i--) {
            const registeredHandler = scope.keys[i];
            const modifiersList = keymapsByKey[registeredHandler.key];
            const foundKeymap = modifiersList?.[registeredHandler.modifiers];
            if (foundKeymap) {
                scope.unregister(registeredHandler);
                removedEventHandlers.push([foundKeymap, registeredHandler]);
            }
        }
        return removedEventHandlers;
    }
    detachCustomInstructionEls() {
        this.customInstructionEls.forEach((el) => {
            el.detach();
        });
    }
    toggleStandardInstructions(shouldShow) {
        const { standardInstructionsEl } = this;
        let displayValue = 'none';
        if (shouldShow) {
            displayValue = '';
            this.detachCustomInstructionEls();
        }
        if (standardInstructionsEl) {
            standardInstructionsEl.style.display = displayValue;
        }
    }
    showCustomInstructions(modal, keymapConfig, keymapInfo, facetKeysInfo) {
        const { mode, facets } = keymapConfig;
        const { modalEl } = modal;
        const keymaps = keymapInfo.filter((keymap) => keymap.modes?.includes(mode));
        this.toggleStandardInstructions(false);
        this.renderCustomInstructions(modalEl, keymaps);
        this.renderFacetInstructions(modalEl, facets?.facetSettings, facetKeysInfo);
    }
    renderFacetInstructions(parentEl, facetSettings, facetKeysInfo) {
        if (facetKeysInfo?.length && facetSettings.shouldShowFacetInstructions) {
            const facetInstructionsEl = this.getCustomInstructionsEl('facets', parentEl);
            facetInstructionsEl.empty();
            parentEl.appendChild(facetInstructionsEl);
            // render the preamble
            const preamble = `filters | ${this.commandDisplayStr(facetSettings.modifiers)}`;
            this.createPromptInstructionCommandEl(facetInstructionsEl, preamble);
            // render each key instruction
            facetKeysInfo.forEach((facetKeyInfo) => {
                const { facet, command, purpose } = facetKeyInfo;
                let modifiers;
                let key;
                let activeCls = null;
                if (facet) {
                    // Note: the command only contain the key, the modifiers has to be derived
                    key = command;
                    modifiers = facet.modifiers;
                    if (facet.isActive) {
                        activeCls = ['qsp-filter-active'];
                    }
                }
                else {
                    // Note: only the reset key is expected to not have an associated facet
                    key = facetSettings.resetKey;
                    modifiers = facetSettings.resetModifiers;
                }
                // if a modifier is specified for this specific facet, it overrides the
                // default modifier so display that too. Otherwise, just show the key alone
                const commandDisplayText = modifiers
                    ? `(${this.commandDisplayStr(modifiers)}) ${key}`
                    : `${key}`;
                this.createPromptInstructionCommandEl(facetInstructionsEl, commandDisplayText, purpose, [], activeCls);
            });
        }
    }
    renderCustomInstructions(parentEl, keymapInfo) {
        const customInstructionsEl = this.getCustomInstructionsEl('custom', parentEl);
        customInstructionsEl.empty();
        parentEl.appendChild(customInstructionsEl);
        keymapInfo.forEach((keymap) => {
            this.createPromptInstructionCommandEl(customInstructionsEl, keymap.command, keymap.purpose);
        });
    }
    showModeTriggerInstructions(parentEl, isEnabled) {
        if (isEnabled) {
            const el = this.customInstructionEls.get('modes');
            if (el) {
                parentEl.appendChild(el);
            }
        }
    }
    renderModeTriggerInstructions(parentEl, config) {
        // Map mode triggers to labels (purpose)
        const instructionsByModeTrigger = new Map([
            [config.headingsListCommand, 'heading list'],
            [config.editorListCommand, 'editor list'],
            [config.bookmarksListCommand, 'bookmark list'],
            [config.commandListCommand, 'command list'],
            [config.workspaceListCommand, 'workspace list'],
            [config.vaultListCommand, 'vault list'],
            [config.symbolListActiveEditorCommand, 'symbol list (active editor)'],
            [config.symbolListCommand, 'symbol list (embedded)'],
            [config.relatedItemsListActiveEditorCommand, 'related items (active editor)'],
            [config.relatedItemsListCommand, 'related items (embedded)'],
        ]);
        const modeInstructionsEl = this.getCustomInstructionsEl('modes', parentEl);
        modeInstructionsEl.detach();
        modeInstructionsEl.empty();
        // Render the preamble
        this.createPromptInstructionCommandEl(modeInstructionsEl, 'mode triggers |');
        // Render each item
        instructionsByModeTrigger.forEach((purpose, modeTrigger) => {
            this.createPromptInstructionCommandEl(modeInstructionsEl, modeTrigger, purpose);
        });
    }
    getCustomInstructionsEl(kind, parentEl) {
        let el = this.customInstructionEls.get(kind);
        if (!el) {
            // CSS classes for each kind of custom instruction element
            const cls = {
                custom: ['qsp-prompt-instructions'],
                facets: ['qsp-prompt-instructions-facets'],
                modes: ['qsp-prompt-instructions-modes'],
            };
            el = this.createPromptInstructionsEl(cls[kind], parentEl);
            this.customInstructionEls.set(kind, el);
        }
        return el;
    }
    createPromptInstructionsEl(cls, parentEl) {
        const elInfo = {
            cls: ['prompt-instructions', ...cls],
        };
        return parentEl.createDiv(elInfo);
    }
    createPromptInstructionCommandEl(parentEl, command, purpose, clsCommand, clsPurpose) {
        clsCommand = clsCommand ?? [];
        const instructionEl = parentEl.createDiv();
        instructionEl.createSpan({
            cls: ['prompt-instruction-command', ...clsCommand],
            text: command,
        });
        if (purpose) {
            clsPurpose = clsPurpose ?? [];
            instructionEl.createSpan({ cls: clsPurpose, text: purpose });
        }
        return instructionEl;
    }
    closeModalIfEmpty(evt, _ctx) {
        const { modal, config } = this;
        if (config.shouldCloseModalOnBackspace && !modal?.inputEl.value) {
            modal.close();
            evt.preventDefault();
        }
    }
    /**
     * Launches the builtin Obsidian hotkey selection dialog for assigning a hotkey to
     * the selected Command in the Chooser
     *
     * @param {KeyboardEvent} _evt
     * @param {KeymapContext} _ctx
     * @returns {(boolean | void)} false
     */
    navigateToCommandHotkeySelector(_evt, _ctx) {
        const { modal, chooser, app: { setting }, } = this;
        const selectedCommand = chooser.values?.[chooser.selectedItem];
        if (selectedCommand) {
            // Open the builtin hotkey selection settings tab
            setting.open();
            const hotkeysSettingTab = setting.openTabById('hotkeys');
            if (hotkeysSettingTab) {
                modal.close();
                const commandId = selectedCommand.item.id;
                hotkeysSettingTab.setQuery(`${commandId}`);
            }
        }
        // Return false to prevent default
        return false;
    }
    /**
     * Toggles the pinned status of the currently selected Command suggestion in the Chooser
     *
     * @param {KeyboardEvent} _evt
     * @param {KeymapContext} _ctx
     * @returns {(boolean | void)}
     */
    togglePinnedCommand(_evt, _ctx) {
        const { app, config, chooser } = this;
        const selectedSugg = chooser.values?.[chooser.selectedItem];
        const pluginInstance = CommandHandler.getEnabledCommandPalettePluginInstance(app);
        if (selectedSugg && pluginInstance) {
            const commandId = selectedSugg.item.id;
            const parentEl = chooser.suggestions[chooser.selectedItem];
            let pinned = pluginInstance.options?.pinned;
            if (pinned) {
                const idx = pinned.indexOf(commandId);
                // When idx is not found, isPinned should be toggled on, and when idx is found
                // isPinned should be toggled off
                selectedSugg.isPinned = idx === -1;
                if (selectedSugg.isPinned) {
                    // Add this command to the pinned list
                    pinned.push(commandId);
                }
                else {
                    // Remove this command command from the pinned list
                    pinned.splice(idx, 1);
                }
            }
            else {
                pinned = [commandId];
                pluginInstance.options.pinned = pinned;
            }
            // Save the updated setting, and update the suggestion rendering
            pluginInstance.saveSettings(pluginInstance.plugin);
            parentEl.empty();
            new CommandHandler(app, config).renderSuggestion(selectedSugg, parentEl);
        }
        // Return false to prevent default
        return false;
    }
    useSelectedItem(evt, _ctx) {
        this.chooser.useSelectedItem(evt);
    }
    insertIntoEditorAsLink(sugg, activeLeaf, insertConfig) {
        const { app: { workspace, fileManager, vault }, } = this;
        const activeMarkdownView = workspace.getActiveViewOfType(obsidian.MarkdownView);
        const isActiveMarkdown = activeMarkdownView?.leaf === activeLeaf;
        const activeFile = activeMarkdownView?.file;
        if (isActiveMarkdown && activeFile) {
            const linkStr = generateMarkdownLink(fileManager, vault, sugg, activeFile.path, insertConfig);
            if (linkStr) {
                activeMarkdownView.editor?.replaceSelection(linkStr);
            }
        }
    }
    navigateItems(evt, isNext) {
        const { isOpen, chooser } = this;
        if (isOpen) {
            let index = chooser.selectedItem;
            index = isNext ? ++index : --index;
            chooser.setSelectedItem(index, evt);
        }
    }
    /**
     * Converts modifiers and key into a string that can be used for visual display purposes, taking into account platform specific modifier renderings.
     *
     * @param {Modifier[]} modifiers
     * @param {?string} [key]
     * @returns {string}
     */
    commandDisplayStr(modifiers, key) {
        let modifierStr = '';
        if (modifiers) {
            const { modifierToPlatformStrMap } = this;
            modifierStr = modifiers
                .map((modifier) => {
                return modifierToPlatformStrMap[modifier]?.toLocaleLowerCase();
            })
                .sort()
                .join(' ');
        }
        return key ? `${modifierStr} ${key}` : modifierStr;
    }
    /**
     * Converts modifiers into a string that can be used to search against Scope.keys
     *
     * @static
     * @param {Modifier[]} modifiers
     * @returns {string}
     */
    static modifiersToKeymapInfoStr(modifiers) {
        // when the 'Mod' modifier is registered, it gets translated to the platform
        // specific version 'Meta' on MacOS or Ctrl on others
        return modifiers
            ?.map((modifier) => (modifier === 'Mod' ? MOD_KEY : modifier))
            .sort()
            .join(',');
    }
}

function createSwitcherPlus(app, plugin) {
    const SystemSwitcherModal = getSystemSwitcherInstance(app)
        ?.QuickSwitcherModal;
    if (!SystemSwitcherModal) {
        console.log('Switcher++: unable to extend system switcher. Plugin UI will not be loaded. Use the builtin switcher instead.');
        return null;
    }
    const SwitcherPlusModal = class extends SystemSwitcherModal {
        constructor(app, plugin) {
            super(app, plugin.options.builtInSystemOptions);
            this.plugin = plugin;
            const { options } = plugin;
            options.shouldShowAlias = this.shouldShowAlias;
            const exKeymap = new SwitcherPlusKeymap(app, this.scope, this.chooser, this, options);
            this.exMode = new ModeHandler(app, options, exKeymap);
        }
        openInMode(mode, sessionOpts) {
            this.exMode.setSessionOpenMode(mode, this.chooser, sessionOpts);
            super.open();
        }
        onOpen() {
            this.exMode.onOpen();
            super.onOpen();
        }
        onClose() {
            super.onClose();
            this.exMode.onClose();
        }
        updateSuggestions() {
            const { exMode, inputEl, chooser } = this;
            exMode.insertSessionOpenModeOrLastInputString(inputEl);
            if (!exMode.updateSuggestions(inputEl.value, chooser, this)) {
                super.updateSuggestions();
            }
        }
        getSuggestions(input) {
            const query = this.exMode.inputTextForStandardMode(input);
            return super.getSuggestions(query);
        }
        onChooseSuggestion(item, evt) {
            if (!this.exMode.onChooseSuggestion(item, evt)) {
                super.onChooseSuggestion(item, evt);
            }
        }
        renderSuggestion(value, parentEl) {
            if (!this.exMode.renderSuggestion(value, parentEl)) {
                super.renderSuggestion(value, parentEl);
            }
        }
    };
    return new SwitcherPlusModal(app, plugin);
}

/**
 * Creates a custom launcher button element by cloning then modifying coreLauncherButtonEl
 * @param  {Element} coreLauncherButtonEl the ootb system launcher button element
 * @param  {MobileLauncherConfig} launcherConfig
 * @param  {()=>void} onclickListener event handler to attach to the new custom button
 * @returns HTMLElement the new custom button element that was created
 */
function createQSPLauncherButton(coreLauncherButtonEl, launcherConfig, onclickListener) {
    let qspLauncherButtonEl = null;
    if (coreLauncherButtonEl) {
        // April 2024: cloneNode(true) should perform a deep copy, but does not copy
        // any event handlers that were attached using addEventListener(), which
        // corePlusButtonEl does use, so it can be safely cloned.
        // Additionally, cloneNode() will copy element ID/Name as well which could result
        // in duplicates, but corePlusButtonEl does not contain ID/Name so it's also safe
        qspLauncherButtonEl = coreLauncherButtonEl.cloneNode(true);
        if (qspLauncherButtonEl) {
            const { iconName, coreLauncherButtonIconSelector } = launcherConfig;
            qspLauncherButtonEl.addClass('qsp-mobile-launcher-button');
            qspLauncherButtonEl.addEventListener('click', onclickListener);
            if (iconName?.length) {
                // Override the core icon, if a custom icon file name is provided
                const iconEl = qspLauncherButtonEl.querySelector(coreLauncherButtonIconSelector);
                if (iconEl) {
                    obsidian.setIcon(iconEl, iconName);
                }
            }
        }
    }
    return qspLauncherButtonEl;
}
/**
 * Remove coreButtonEl from DOM and replaces it with qspButtonEl
 * @param  {Element} coreButtonEl
 * @param  {HTMLElement} qspButtonEl
 * @returns boolean True if succeeded
 */
function replaceCoreLauncherButtonWithQSPButton(coreButtonEl, qspButtonEl) {
    let isSuccessful = false;
    if (coreButtonEl && qspButtonEl) {
        // Hide the button before adding to DOM
        const initialDisplay = qspButtonEl.style.display;
        qspButtonEl.style.display = 'none';
        if (coreButtonEl.insertAdjacentElement('beforebegin', qspButtonEl)) {
            coreButtonEl.remove();
            isSuccessful = true;
        }
        qspButtonEl.style.display = initialDisplay;
    }
    return isSuccessful;
}
/**
 * Finds the "⊕" button element using the default selector.
 * If that fails, retries using the selector stored in settings
 * @param  {App} app
 * @param  {MobileLauncherConfig} launcherConfig
 * @returns Element The button Element
 */
function getCoreLauncherButtonElement(app, launcherConfig) {
    let coreLauncherButtonEl = null;
    const containerEl = app?.mobileNavbar?.containerEl;
    if (containerEl) {
        coreLauncherButtonEl = containerEl.querySelector(SwitcherPlusSettings.defaults.mobileLauncher.coreLauncherButtonSelector);
        if (!coreLauncherButtonEl) {
            // Element wasn't found using the default selector, try using the custom selector
            coreLauncherButtonEl = containerEl.querySelector(launcherConfig.coreLauncherButtonSelector);
        }
    }
    return coreLauncherButtonEl;
}
class MobileLauncher {
    /**
     * Overrides the default functionality of the "⊕" button on mobile platforms
     * to launch Switcher++ instead of the default system switcher.
     * @param  {App} app
     * @param  {MobileLauncherConfig} launcherConfig
     * @param  {()=>void} onclickListener event handler to attach to the new custom button
     * @returns HTMLElement the new launcher button element if created
     */
    static installMobileLauncherOverride(app, launcherConfig, onclickListener) {
        let qspLauncherButtonEl = null;
        // If it's not a mobile platform, or the override feature is disabled, or the
        // core launcher has already been overridden then do nothing.
        if (!obsidian.Platform.isMobile ||
            !launcherConfig.isEnabled ||
            MobileLauncher.coreMobileLauncherButtonEl) {
            return null;
        }
        const coreLauncherButtonEl = getCoreLauncherButtonElement(app, launcherConfig);
        if (coreLauncherButtonEl) {
            const qspButtonEl = createQSPLauncherButton(coreLauncherButtonEl, launcherConfig, onclickListener);
            if (replaceCoreLauncherButtonWithQSPButton(coreLauncherButtonEl, qspButtonEl)) {
                MobileLauncher.coreMobileLauncherButtonEl = coreLauncherButtonEl;
                MobileLauncher.qspMobileLauncherButtonEl = qspButtonEl;
                qspLauncherButtonEl = qspButtonEl;
            }
        }
        return qspLauncherButtonEl;
    }
    /**
     * Restores the default functionality of the "⊕" button on mobile platforms and
     * removes the custom launcher button.
     * @returns boolean true if successful
     */
    static removeMobileLauncherOverride() {
        let isSuccessful = false;
        if (!MobileLauncher.coreMobileLauncherButtonEl) {
            return isSuccessful;
        }
        if (MobileLauncher.qspMobileLauncherButtonEl?.parentElement) {
            const qspButtonEl = MobileLauncher.qspMobileLauncherButtonEl;
            const coreButtonEl = MobileLauncher.coreMobileLauncherButtonEl;
            const initialDisplay = coreButtonEl.style.display;
            coreButtonEl.style.display = 'none';
            if (qspButtonEl.insertAdjacentElement('beforebegin', coreButtonEl)) {
                qspButtonEl.remove();
                MobileLauncher.qspMobileLauncherButtonEl = null;
                MobileLauncher.coreMobileLauncherButtonEl = null;
                isSuccessful = true;
            }
            coreButtonEl.style.display = initialDisplay;
        }
        return isSuccessful;
    }
}

const COMMAND_DATA = [
    {
        id: 'switcher-plus:open',
        name: 'Open in Standard Mode',
        mode: Mode.Standard,
        iconId: 'lucide-file-search',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-editors',
        name: 'Open in Editor Mode',
        mode: Mode.EditorList,
        iconId: 'lucide-file-edit',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-symbols',
        name: 'Open Symbols for selected suggestion or editor',
        mode: Mode.SymbolList,
        iconId: 'lucide-dollar-sign',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-symbols-active',
        name: 'Open Symbols for the active editor',
        mode: Mode.SymbolList,
        iconId: 'lucide-dollar-sign',
        ribbonIconEl: null,
        sessionOpts: { useActiveEditorAsSource: true },
    },
    {
        id: 'switcher-plus:open-workspaces',
        name: 'Open in Workspaces Mode',
        mode: Mode.WorkspaceList,
        iconId: 'lucide-album',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-headings',
        name: 'Open in Headings Mode',
        mode: Mode.HeadingsList,
        iconId: 'lucide-file-search',
        ribbonIconEl: null,
    },
    {
        // Note: leaving this id with the old starred plugin name so that user
        // don't have to update their hotkey mappings when they upgrade
        id: 'switcher-plus:open-starred',
        name: 'Open in Bookmarks Mode',
        mode: Mode.BookmarksList,
        iconId: 'lucide-bookmark',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-commands',
        name: 'Open in Commands Mode',
        mode: Mode.CommandList,
        iconId: 'run-command',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-related-items',
        name: 'Open Related Items for selected suggestion or editor',
        mode: Mode.RelatedItemsList,
        iconId: 'lucide-file-plus-2',
        ribbonIconEl: null,
    },
    {
        id: 'switcher-plus:open-related-items-active',
        name: 'Open Related Items for the active editor',
        mode: Mode.RelatedItemsList,
        iconId: 'lucide-file-plus-2',
        ribbonIconEl: null,
        sessionOpts: { useActiveEditorAsSource: true },
    },
    {
        id: 'switcher-plus:open-vaults',
        name: 'Open in Vaults Mode',
        mode: Mode.VaultList,
        iconId: 'vault',
        ribbonIconEl: null,
    },
];
class SwitcherPlusPlugin extends obsidian.Plugin {
    async onload() {
        const options = new SwitcherPlusSettings(this);
        await options.updateDataAndLoadSettings();
        this.options = options;
        this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, options));
        this.registerRibbonCommandIcons();
        this.updateMobileLauncherButtonOverride(options.mobileLauncher.isEnabled);
        COMMAND_DATA.forEach(({ id, name, mode, iconId, sessionOpts }) => {
            this.registerCommand(id, name, mode, iconId, sessionOpts);
        });
    }
    onunload() {
        this.updateMobileLauncherButtonOverride(false);
    }
    registerCommand(id, name, mode, iconId, sessionOpts) {
        this.addCommand({
            id,
            name,
            icon: iconId,
            checkCallback: (checking) => {
                return this.createModalAndOpen(mode, checking, sessionOpts);
            },
        });
    }
    registerRibbonCommandIcons() {
        // remove any registered icons
        COMMAND_DATA.forEach((data) => {
            data.ribbonIconEl?.remove();
            data.ribbonIconEl = null;
        });
        // map to keyed object
        const commandDataByMode = COMMAND_DATA.reduce((acc, curr) => {
            acc[curr.mode] = curr;
            return acc;
        }, {});
        this.options.enabledRibbonCommands.forEach((command) => {
            const data = commandDataByMode[Mode[command]];
            if (data) {
                data.ribbonIconEl = this.addRibbonIcon(data.iconId, data.name, () => {
                    this.createModalAndOpen(data.mode, false);
                });
            }
        });
    }
    createModalAndOpen(mode, isChecking, sessionOpts) {
        if (!isChecking) {
            // modal needs to be created dynamically (same as system switcher)
            // as system options are evaluated in the modal constructor
            const modal = createSwitcherPlus(this.app, this);
            if (!modal) {
                return false;
            }
            modal.openInMode(mode, sessionOpts);
        }
        return true;
    }
    updateMobileLauncherButtonOverride(isEnabled) {
        if (isEnabled) {
            const onclickListener = () => {
                const modeString = this.options.mobileLauncher.modeString;
                const openMode = Mode[modeString];
                if (openMode) {
                    this.createModalAndOpen(openMode, false);
                }
            };
            MobileLauncher.installMobileLauncherOverride(this.app, this.options.mobileLauncher, onclickListener);
        }
        else {
            MobileLauncher.removeMobileLauncherOverride();
        }
    }
}

module.exports = SwitcherPlusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3R5cGVzL3NoYXJlZFR5cGVzLnRzIiwiLi4vLi4vc3JjL3V0aWxzL3V0aWxzLnRzIiwiLi4vLi4vc3JjL3V0aWxzL2Zyb250TWF0dGVyUGFyc2VyLnRzIiwiLi4vLi4vc3JjL3NldHRpbmdzL2ZhY2V0Q29uc3RhbnRzLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3RzLWRlZXBtZXJnZS9lc20vaW5kZXguanMiLCIuLi8uLi9zcmMvc2V0dGluZ3Mvc3dpdGNoZXJQbHVzU2V0dGluZ3MudHMiLCIuLi8uLi9zcmMvc2V0dGluZ3Mvc2V0dGluZ3NUYWJTZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NldHRpbmdzL2Jvb2ttYXJrc1NldHRpbmdzVGFiU2VjdGlvbi50cyIsIi4uLy4uL3NyYy9zZXR0aW5ncy9jb21tYW5kTGlzdFNldHRpbmdzVGFiU2VjdGlvbi50cyIsIi4uLy4uL3NyYy9zZXR0aW5ncy9yZWxhdGVkSXRlbXNTZXR0aW5nc1RhYlNlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2V0dGluZ3MvZ2VuZXJhbFNldHRpbmdzVGFiU2VjdGlvbi50cyIsIi4uLy4uL3NyYy9zZXR0aW5ncy93b3Jrc3BhY2VTZXR0aW5nc1RhYlNlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2V0dGluZ3MvZWRpdG9yU2V0dGluZ3NUYWJTZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NldHRpbmdzL2hlYWRpbmdzU2V0dGluZ3NUYWJTZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NldHRpbmdzL3N5bWJvbFNldHRpbmdzVGFiU2VjdGlvbi50cyIsIi4uLy4uL3NyYy9zZXR0aW5ncy92YXVsdExpc3RTZXR0aW5nc1RhYlNlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2V0dGluZ3Mvc3dpdGNoZXJQbHVzU2V0dGluZ1RhYi50cyIsIi4uLy4uL3NyYy9zd2l0Y2hlclBsdXMvaW5wdXRJbmZvLnRzIiwiLi4vLi4vc3JjL0hhbmRsZXJzL2hhbmRsZXIudHMiLCIuLi8uLi9zcmMvSGFuZGxlcnMvd29ya3NwYWNlSGFuZGxlci50cyIsIi4uLy4uL3NyYy9IYW5kbGVycy9zdGFuZGFyZEV4SGFuZGxlci50cyIsIi4uLy4uL3NyYy9IYW5kbGVycy9lZGl0b3JIYW5kbGVyLnRzIiwiLi4vLi4vc3JjL0hhbmRsZXJzL2Jvb2ttYXJrc0hhbmRsZXIudHMiLCIuLi8uLi9zcmMvSGFuZGxlcnMvaGVhZGluZ3NIYW5kbGVyLnRzIiwiLi4vLi4vc3JjL0hhbmRsZXJzL3N5bWJvbEhhbmRsZXIudHMiLCIuLi8uLi9zcmMvSGFuZGxlcnMvY29tbWFuZEhhbmRsZXIudHMiLCIuLi8uLi9zcmMvSGFuZGxlcnMvcmVsYXRlZEl0ZW1zSGFuZGxlci50cyIsIi4uLy4uL3NyYy9IYW5kbGVycy92YXVsdEhhbmRsZXIudHMiLCIuLi8uLi9zcmMvc3dpdGNoZXJQbHVzL21vZGVIYW5kbGVyLnRzIiwiLi4vLi4vc3JjL3N3aXRjaGVyUGx1cy9zd2l0Y2hlclBsdXNLZXltYXAudHMiLCIuLi8uLi9zcmMvc3dpdGNoZXJQbHVzL3N3aXRjaGVyUGx1cy50cyIsIi4uLy4uL3NyYy9zd2l0Y2hlclBsdXMvbW9iaWxlTGF1bmNoZXIudHMiLCIuLi8uLi9zcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6bnVsbCwibmFtZXMiOlsibm9ybWFsaXplUGF0aCIsInBhcnNlTGlua3RleHQiLCJTZXR0aW5nIiwiTW9kYWwiLCJQbHVnaW5TZXR0aW5nVGFiIiwicHJlcGFyZVF1ZXJ5IiwiS2V5bWFwIiwiUGxhdGZvcm0iLCJzZXRJY29uIiwicmVuZGVyUmVzdWx0cyIsImZ1enp5U2VhcmNoIiwiVmlldyIsIkZpbGVWaWV3Iiwic29ydFNlYXJjaFJlc3VsdHMiLCJpcGNSZW5kZXJlciIsImRlYm91bmNlIiwiTWFya2Rvd25WaWV3IiwiUGx1Z2luIl0sIm1hcHBpbmdzIjoiOzs7OztBQTBCQSxJQUFZLGlCQU1YLENBQUE7QUFORCxDQUFBLFVBQVksaUJBQWlCLEVBQUE7QUFDM0IsSUFBQSxpQkFBQSxDQUFBLGlC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QUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBSTtZQUNyRCxNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUU5QyxJQUFJLElBQUksRUFBRTtBQUNSLGdCQUFBLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBSztvQkFDbEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUMsaUJBQUMsQ0FBQyxDQUFDO2FBQ0o7QUFDSCxTQUFDLENBQUMsQ0FBQztLQUNKO0FBRUQsSUFBQSxrQkFBa0IsQ0FDaEIsSUFBVSxFQUNWLFVBQW1CLEVBQ25CLFdBQW1DLEVBQUE7UUFFbkMsSUFBSSxDQUFDLFVBQVUsRUFBRTs7O1lBR2YsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ1YsZ0JBQUEsT0FBTyxLQUFLLENBQUM7YUFDZDtBQUVELFlBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FDckM7QUFFRCxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFFRCxJQUFBLGtDQUFrQyxDQUFDLFNBQWtCLEVBQUE7UUFDbkQsSUFBSSxTQUFTLEVBQUU7WUFDYixNQUFNLGVBQWUsR0FBRyxNQUFLO2dCQUMzQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUErQixDQUFDO0FBQy9FLGdCQUFBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFbEMsSUFBSSxRQUFRLEVBQUU7QUFDWixvQkFBQSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUMxQztBQUNILGFBQUMsQ0FBQztBQUVGLFlBQUEsY0FBYyxDQUFDLDZCQUE2QixDQUMxQyxJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUMzQixlQUFlLENBQ2hCLENBQUM7U0FDSDthQUFNO1lBQ0wsY0FBYyxDQUFDLDRCQUE0QixFQUFFLENBQUM7U0FDL0M7S0FDRjtBQUNGOzs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOls0XX0=
