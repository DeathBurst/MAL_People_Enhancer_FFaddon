"use strict";


class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}


function parseRoles() {
  const table = findVoiceActingTable();

  const roleRows = Array.from(
    table.querySelectorAll("tr.js-people-character")
  );

  if (roleRows.length === 0) {
    throw new ParseError(
      "Voice Acting Roles table contains no recognizable role rows."
    );
  }

  return roleRows.map((row, index) => {
    try {
      return parseRoleRow(row);
    } catch (error) {
      if (error instanceof ParseError) {
        throw new ParseError(
          `Unable to parse Voice Acting Roles row ${index + 1}: ` +
          error.message
        );
      }

      throw error;
    }
  });
}


function findVoiceActingTable() {
  const headings = Array.from(
    document.querySelectorAll("h2, h3")
  );

  const voiceActingHeading = headings.find(
    heading =>
      heading.textContent.trim().includes("Voice Acting Roles")
  );

  if (!voiceActingHeading) {
    throw new ParseError(
      "Could not find the Voice Acting Roles heading."
    );
  }

  const staffHeading = headings.find(
    heading =>
      heading.textContent.trim().includes(
        "Anime Staff Positions"
      )
  );

  const tables = Array.from(document.querySelectorAll("table"));

  for (const table of tables) {
    const isAfterVoiceHeading = Boolean(
      voiceActingHeading.compareDocumentPosition(table) &
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    if (!isAfterVoiceHeading) {
      continue;
    }

    if (staffHeading) {
      const isAfterStaffHeading = Boolean(
        staffHeading.compareDocumentPosition(table) &
        Node.DOCUMENT_POSITION_FOLLOWING
      );

      if (isAfterStaffHeading) {
        break;
      }
    }

    if (table.querySelector("tr.js-people-character")) {
      return table;
    }
  }

  throw new ParseError(
    "Could not find the Voice Acting Roles table."
  );
}

function parseRoleRow(row) {
  const cells = Array.from(row.children).filter(
    element => element.tagName === "TD"
  );

  if (cells.length !== 4) {
    throw new ParseError(
      `Expected 4 cells in role row, found ${cells.length}.`
    );
  }

  const [
    entryImageCell,
    entryCell,
    characterCell,
    characterImageCell
  ] = cells;

  // entryImageCell is intentionally unused for now.
  void entryImageCell;

  // Entry-cell parsing
  const entryLink = entryCell.querySelector("a.js-people-title");

  if (!entryLink) {
    throw new ParseError("Entry link not found.");
  }

  const {
    url: entryUrl,
    name: entryTitle
  } = extractUrlName(entryLink, "entry");

  const {
    medium,
    periodDisplay
  } = extractMediumAndPeriod(entryCell);

  const {
    dateSort,
    sourceOrder
  } = extractDateSortValues(entryCell);

  // Character-cell parsing
  const characterLink = extractCharacterLink(characterCell);

  const {
    url: characterUrl,
    name: characterName
  } = extractUrlName(characterLink, "character");

  const roleType = extractRoleType(characterCell);
  const favorites = extractFavorites(characterCell);

  // Character-image-cell parsing
  const characterImageUrl = extractCharacterImageUrl(
    characterImageCell,
    characterUrl
  );

  return {
    characterName,
    characterUrl,
    characterImageUrl,
    favorites,

    entryTitle,
    entryUrl,
    medium,
    periodDisplay,
    roleType,
    dateSort,
    sourceOrder
  };
}


function getLinkText(link, label = "link") {
  const text = link.textContent.trim();

  if (!text) {
    throw new ParseError(`${label} link has no text.`);
  }

  return text;
}


function requiredUrl(link, label) {
  const href = link.getAttribute("href");

  if (typeof href !== "string" || !href.trim()) {
    throw new ParseError(`${label} link has no URL.`);
  }

  return new URL(href, document.baseURI).href;
}


function extractUrlName(link, label = "cell") {
  return {
    url: requiredUrl(link, label),
    name: getLinkText(link, label)
  };
}


function extractDateSortValues(entryCell) {
  const element = entryCell.querySelector("small.entry-date");

  if (!element) {
    throw new ParseError("Missing entry-date element.");
  }

  const rawValue = element.textContent.trim();

  if (!/^\d{14}$/.test(rawValue)) {
    throw new ParseError(
      `Invalid entry-date value: ${JSON.stringify(rawValue)}.`
    );
  }

  return {
    dateSort: Number.parseInt(rawValue.slice(0, 8), 10),
    sourceOrder: Number.parseInt(rawValue.slice(8), 10)
  };
}


function extractCharacterLink(characterCell) {
  const links = characterCell.querySelectorAll(
    'a[href*="/character/"]'
  );

  for (const link of links) {
    if (link.textContent.trim()) {
      return link;
    }
  }

  throw new ParseError("Character link not found.");
}


function extractRoleType(characterCell) {
  const elements = characterCell.querySelectorAll(".spaceit_pad");

  for (const element of elements) {
    const text = element.textContent.trim();

    if (text === "Main" || text === "Supporting") {
      return text;
    }
  }

  throw new ParseError(
    "Missing Main/Supporting classification."
  );
}


function extractFavorites(characterCell) {
  const element = characterCell.querySelector(
    "small.js-people-favorites"
  );

  if (!element) {
    throw new ParseError("Missing hidden favorites value.");
  }

  const rawValue = element.textContent
    .trim()
    .replaceAll(",", "");

  if (!/^\d+$/.test(rawValue)) {
    throw new ParseError(
      `Invalid favorites value: ${JSON.stringify(rawValue)}.`
    );
  }

  return Number.parseInt(rawValue, 10);
}


function extractMediumAndPeriod(entryCell) {
  const element = entryCell.querySelector(".anime-info-text");

  if (!element) {
    throw new ParseError(
      "Missing anime medium/period element."
    );
  }

  const rawValue = element.textContent.trim();

  // The element exists, but MAL has no metadata for this entry.
  if (!rawValue) {
    return {
      medium: "",
      periodDisplay: ""
    };
  }

  const separatorIndex = rawValue.indexOf(",");

  if (separatorIndex === -1) {
    return {
      medium: rawValue.trim(),
      periodDisplay: ""
    };
  }

  return {
    medium: rawValue.slice(0, separatorIndex).trim(),
    periodDisplay: rawValue.slice(separatorIndex + 1).trim()
  };
}


function extractCharacterImageUrl(
  characterImageCell,
  characterUrl
) {
  const links = characterImageCell.querySelectorAll(
    'a[href*="/character/"]'
  );

  for (const link of links) {
    const href = link.getAttribute("href");

    if (typeof href !== "string" || !href.trim()) {
      continue;
    }

    const absoluteUrl = new URL(
      href,
      document.baseURI
    ).href;

    if (absoluteUrl !== characterUrl) {
      continue;
    }

    const image = link.querySelector("img");

    if (!image) {
      continue;
    }

    const imageUrl =
      image.getAttribute("data-src") ||
      image.getAttribute("src");

    if (imageUrl && imageUrl.trim()) {
      return new URL(
        imageUrl,
        document.baseURI
      ).href;
    }
  }

  throw new ParseError(
    "Missing character portrait URL."
  );
}


class GroupingError extends Error {
  constructor(message) {
    super(message);
    this.name = "GroupingError";
  }
}


function groupRoles(rows) {
  const grouped = new Map();

  for (const row of rows) {
    let groupedRole = grouped.get(row.characterUrl);

    if (!groupedRole) {
      groupedRole = {
        characterUrl: row.characterUrl,
        characterName: row.characterName,
        characterImageUrl: row.characterImageUrl,
        favorites: row.favorites,
        appearances: []
      };

      grouped.set(row.characterUrl, groupedRole);
    } else {
      validateCharacterMetadata(groupedRole, row);
    }

    groupedRole.appearances.push({
      characterUrl: row.characterUrl,

      entryTitle: row.entryTitle,
      entryUrl: row.entryUrl,

      medium: row.medium,
      periodDisplay: row.periodDisplay,
      roleType: row.roleType,

      dateSort: row.dateSort,
      sourceOrder: row.sourceOrder
    });
  }

  const groupedRoles = Array.from(grouped.values());

  for (const role of groupedRoles) {
    role.firstAppearance = findFirstAppearance(role);
    role.latestAppearance = findLatestAppearance(role);
	role.classification = classifyCharacter(role.appearances);
  }

  groupedRoles.sort(compareGroupedRoles);

  return groupedRoles;
}


function validateCharacterMetadata(groupedRole, row) {
  if (row.characterName !== groupedRole.characterName) {
    throw new GroupingError(
      `Inconsistent character names for ${row.characterUrl}: ` +
      `${JSON.stringify(groupedRole.characterName)} and ` +
      `${JSON.stringify(row.characterName)}.`
    );
  }

  if (row.favorites !== groupedRole.favorites) {
    throw new GroupingError(
      `Inconsistent favorite counts for ${row.characterUrl}: ` +
      `${groupedRole.favorites} and ${row.favorites}.`
    );
  }

  if (
    row.characterImageUrl !== groupedRole.characterImageUrl
  ) {
    throw new GroupingError(
      `Inconsistent character portraits for ${row.characterUrl}: ` +
      `${JSON.stringify(groupedRole.characterImageUrl)} and ` +
      `${JSON.stringify(row.characterImageUrl)}.`
    );
  }
}


function compareGroupedRoles(left, right) {
  const appearanceDifference =
    right.appearances.length - left.appearances.length;

  if (appearanceDifference !== 0) {
    return appearanceDifference;
  }

  return right.favorites - left.favorites;
}

function compareAppearancesChronologically(left, right) {
  if (left.dateSort !== right.dateSort) {
    return left.dateSort - right.dateSort;
  }

  // For the same dateSort, MAL's smaller sourceOrder is more recent.
  return right.sourceOrder - left.sourceOrder;
}


function findFirstAppearance(role) {
  if (role.appearances.length === 0) {
    throw new GroupingError(
      `Grouped role ${role.characterUrl} has no appearances.`
    );
  }

  return role.appearances.reduce(
    (first, appearance) =>
      compareAppearancesChronologically(
        appearance,
        first
      ) < 0
        ? appearance
        : first
  );
}


function findLatestAppearance(role) {
  if (role.appearances.length === 0) {
    throw new GroupingError(
      `Grouped role ${role.characterUrl} has no appearances.`
    );
  }

  return role.appearances.reduce(
    (latest, appearance) =>
      compareAppearancesChronologically(
        appearance,
        latest
      ) > 0
        ? appearance
        : latest
  );
}

function classifyCharacter(appearances) {
  if (appearances.length === 0) {
    throw new GroupingError(
      "Cannot classify a character with no appearances."
    );
  }

  const mainAppearances = appearances.filter(
    appearance => appearance.roleType === "Main"
  );

  const supportingAppearances = appearances.filter(
    appearance => appearance.roleType === "Supporting"
  );

  if (
    mainAppearances.length + supportingAppearances.length !==
    appearances.length
  ) {
    throw new GroupingError(
      "Cannot classify character: unexpected role type."
    );
  }

  if (supportingAppearances.length === 0) {
    return "Main";
  }

  if (mainAppearances.length === 0) {
    return "Supporting";
  }

  const chronologicalAppearances = [...appearances].sort(
    compareAppearancesChronologically
  );

  const firstMainIndex = chronologicalAppearances.findIndex(
    appearance => appearance.roleType === "Main"
  );

  const appearancesSinceFirstMain =
    chronologicalAppearances.slice(firstMainIndex);

  const mainSinceFirstMain = appearancesSinceFirstMain.filter(
    appearance => appearance.roleType === "Main"
  ).length;

  const mainRatio =
    mainSinceFirstMain / appearancesSinceFirstMain.length;

  const latestAppearance =
    chronologicalAppearances.at(-1);

  if (
    mainAppearances.length >= 2 &&
    latestAppearance.roleType === "Main" &&
    mainRatio >= 2 / 3
  ) {
    return "Main";
  }

  if (mainRatio <= 1 / 3) {
    return "Supporting";
  }

  return "Mixed";
}

// Injection

const ROLE_TYPE_STATES = [
  {
    label: "Role",
    visibleTypes: ["Main", "Mixed", "Supporting"],
    sortOrder: null,
    ariaSort: null
  },
  {
    label: "No Support.",
    visibleTypes: ["Main", "Mixed"],
    sortOrder: ["Main", "Mixed"],
    ariaSort: null
  },
  {
    label: "Main only",
    visibleTypes: ["Main"],
    sortOrder: ["Main"],
    ariaSort: null
  },
  {
    label: "Role",
    visibleTypes: ["Main", "Mixed", "Supporting"],
    sortOrder: ["Supporting", "Mixed", "Main"],
    ariaSort: "ascending"
  },
  {
    label: "Role",
    visibleTypes: ["Main", "Mixed", "Supporting"],
    sortOrder: ["Main", "Mixed", "Supporting"],
    ariaSort: "descending"
  }
];

function applyRoleTypeState(
  table,
  header,
  label,
  state
) {
  const groups = Array.from(
    table.querySelectorAll("tbody.mal-role-group")
  );

  const visibleTypes = new Set(state.visibleTypes);

  for (const group of groups) {
    group.hidden = !visibleTypes.has(
      group.dataset.classification
    );
  }

  if (state.sortOrder) {
    const ranks = new Map(
      state.sortOrder.map((classification, index) => [
        classification,
        index
      ])
    );

    groups.sort((left, right) => {
      return (
        ranks.get(left.dataset.classification) -
        ranks.get(right.dataset.classification)
      );
    });

    for (const group of groups) {
      table.append(group);
    }
  }

  label.textContent = state.label;

  header.removeAttribute("aria-sort");

  if (state.ariaSort) {
    header.setAttribute("aria-sort", state.ariaSort);
  }
}

function injectEnhancedTable(groupedRoles) {
  const originalTable = findVoiceActingTable();

  // Prevent duplicate injection when the content script is rerun.
  document.querySelector("#mal-people-enhanced-roles")?.remove();

  const container = document.createElement("section");
  container.id = "mal-people-enhanced-roles";

  const heading = document.createElement("h2");
  heading.textContent = "Enhanced Voice Acting Roles";

  const summary = document.createElement("p");
  const classificationCounts = {
    Main: 0,
    Mixed: 0,
    Supporting: 0
  };
  
  for (const role of groupedRoles) {
    classificationCounts[role.classification]++;
  }
  
  summary.textContent =
    `${groupedRoles.length} distinct roles ` +
    `→ ${classificationCounts.Main} Main / ` +
    `${classificationCounts.Mixed} Mixed / ` +
    `${classificationCounts.Supporting} Supporting`;
		
  const table = document.createElement("table");
  table.className = "mal-enhanced-table";

  const columns = [
    {
      heading: "Character",
      sortType: "text",
      value: role => role.characterName.toLocaleLowerCase(),
      render: renderCharacterCell
    },
	{
	  heading: "Role",
	  sortType: "role-type",
	  value: role => role.classification,
	  render: renderClassificationCell,
	  roleTypeControl: true
	},
    {
      heading: "Favorites",
      sortType: "number",
      value: role => role.favorites,
      render: renderFavoritesCell,
    },
    {
      heading: "Appearances",
      sortType: "number",
      value: role => role.appearances.length,
      render: renderAppearancesCell
    },
	{
	  heading: "First appearance",
	  sortType: "number",
	  value: role => appearanceSortValue(role.firstAppearance),
	  render: (role, cell) =>
		renderPeriodCell(cell, role.firstAppearance)
	},
	{
	  heading: "Latest appearance",
	  sortType: "number",
	  value: role => appearanceSortValue(role.latestAppearance),
	  render: (role, cell) =>
		renderPeriodCell(cell, role.latestAppearance)
	}
  ];

  const tableHead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  let roleTypeStateIndex = 0;

  columns.forEach((column, columnIndex) => {
    const header = document.createElement("th");
    header.scope = "col";
    header.dataset.sortType = column.sortType;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mal-sort-button";
    
    const label = document.createElement("span");
    label.className = "mal-column-label";
    label.textContent = column.heading;
    
    const indicator = document.createElement("span");
    indicator.className = "mal-sort-indicator";
    indicator.setAttribute("aria-hidden", "true");
    
    button.append(label, " ", indicator);
    
    if (column.roleTypeControl) {
      button.addEventListener("click", () => {
        roleTypeStateIndex =
          (roleTypeStateIndex + 1) %
          ROLE_TYPE_STATES.length;
    
        applyRoleTypeState(
          table,
          header,
          label,
          ROLE_TYPE_STATES[roleTypeStateIndex]
        );
      });
    } else {
      button.addEventListener("click", () => {
        /*
         * If Role is currently only filtering, preserve that filter.
         * If it is merely sorting all roles, another column sort
         * supersedes it, so return the Role control to its default state.
         */
        if (roleTypeStateIndex >= 3) {
          roleTypeStateIndex = 0;
    
          const roleHeader = columns
            .map((candidate, index) => ({
              candidate,
              index
            }))
            .find(item => item.candidate.roleTypeControl);
    
          if (roleHeader) {
            const roleHeaderElement =
              headerRow.children[roleHeader.index];
    
            roleHeaderElement
              .querySelector(".mal-column-label")
              .textContent = "Role";
    
            roleHeaderElement.removeAttribute("aria-sort");
          }
        }
    
        const currentDirection =
          header.getAttribute("aria-sort");
    
        const nextDirection =
          currentDirection === "ascending"
            ? "descending"
            : "ascending";
    
        sortEnhancedTable(
          table,
          columns,
          columnIndex,
          nextDirection
        );
      });
    }
    
    header.append(button);
    headerRow.append(header);
  });

  tableHead.append(headerRow);
  table.append(tableHead);

  groupedRoles.forEach(role => {
    const group = document.createElement("tbody");
    group.className = "mal-role-group";
    group.dataset.classification = role.classification;
	
    const roleRow = document.createElement("tr");
    roleRow.className = "mal-role-row";

    columns.forEach(column => {
      const cell = document.createElement("td");

      cell.dataset.sortValue = String(column.value(role));
      column.render(role, cell);

      roleRow.append(cell);
    });

    const entriesRow = document.createElement("tr");
    entriesRow.className = "mal-entries-row";
    entriesRow.hidden = true;

    const entriesCell = document.createElement("td");
    entriesCell.colSpan = columns.length;

    const entryList = document.createElement("div");
    entryList.className = "mal-entry-list";

    role.appearances.forEach(appearance => {
      entryList.append(renderAppearance(appearance));
    });

    entriesCell.append(entryList);
    entriesRow.append(entriesCell);

    group.append(roleRow, entriesRow);
    table.append(group);
  });

  container.append(heading, summary, table);

  originalTable.parentNode.insertBefore(
    container,
    originalTable
  );
}


function renderCharacterCell(role, cell) {
  const wrapper = document.createElement("div");
  wrapper.className = "mal-character-cell";

  const portrait = document.createElement("img");
  portrait.className = "mal-character-portrait";
  portrait.src = role.characterImageUrl;
  portrait.alt = "";
  portrait.loading = "lazy";

  const link = document.createElement("a");
  link.href = role.characterUrl;
  link.textContent = role.characterName;

  wrapper.append(portrait, link);
  cell.append(wrapper);
}

function renderClassificationCell(role, cell) {
  cell.textContent = role.classification;
}

function renderFavoritesCell(role, cell) {
  cell.textContent = role.favorites.toLocaleString();
}


function renderAppearancesCell(role, cell) {
  const count = document.createElement("span");
  count.textContent = String(role.appearances.length);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "mal-entries-toggle";
  button.textContent = "show";
  button.setAttribute("aria-expanded", "false");

  button.addEventListener("click", () => {
    const group = cell.closest(".mal-role-group");
    const entriesRow = group.querySelector(".mal-entries-row");

    const isExpanded =
      button.getAttribute("aria-expanded") === "true";

    entriesRow.hidden = isExpanded;
    button.setAttribute(
      "aria-expanded",
      String(!isExpanded)
    );
    button.textContent = isExpanded ? "show" : "hide";
  });

  cell.append(count, " ", button);
}


function renderPeriodCell(role, appearance) {
  role.textContent = formatAppearancePeriod(appearance);
}


function renderAppearance(appearance) {
  const line = document.createElement("div");
  line.className = "mal-entry";

  const link = document.createElement("a");
  link.href = appearance.entryUrl;
  link.textContent = appearance.entryTitle;

  const metadata = [
    appearance.medium,
    appearance.periodDisplay,
    appearance.roleType
  ].filter(Boolean);

  line.append(link);

  if (metadata.length > 0) {
    line.append(` (${metadata.join(", ")})`);
  }

  return line;
}


function appearanceSortValue(appearance) {
  return (
    appearance.dateSort * 1_000_000 -
    appearance.sourceOrder
  );
}


function formatAppearancePeriod(appearance) {
  const isTv = appearance.medium === "TV";

  const hasDetailedPeriod =
    appearance.periodDisplay !== "" &&
    !/^\d{4}$/.test(appearance.periodDisplay);

  if (isTv !== hasDetailedPeriod) {
    console.warn(
      "Unexpected medium/period combination; using date_sort.",
      {
        entry: appearance.entryTitle,
        medium: appearance.medium,
        periodDisplay: appearance.periodDisplay,
        dateSort: appearance.dateSort
      }
    );

    return formatDateSort(appearance.dateSort);
  }

  return appearance.periodDisplay;
}


function formatDateSort(dateSort) {
  const rawDate = String(dateSort).padStart(8, "0");

  return (
    `${rawDate.slice(0, 4)}-` +
    `${rawDate.slice(4, 6)}-` +
    rawDate.slice(6, 8)
  );
}


function sortEnhancedTable(
  table,
  columns,
  columnIndex,
  direction
) {
  const groups = Array.from(
    table.querySelectorAll("tbody.mal-role-group")
  );

  const column = columns[columnIndex];
  const multiplier = direction === "ascending" ? 1 : -1;

  groups.sort((leftGroup, rightGroup) => {
    const leftCell =
      leftGroup.querySelectorAll(".mal-role-row td")[columnIndex];

    const rightCell =
      rightGroup.querySelectorAll(".mal-role-row td")[columnIndex];

    let leftValue = leftCell.dataset.sortValue;
    let rightValue = rightCell.dataset.sortValue;

    if (column.sortType === "number") {
      leftValue = Number(leftValue);
      rightValue = Number(rightValue);

      return (leftValue - rightValue) * multiplier;
    }

    return leftValue.localeCompare(
      rightValue,
      undefined,
      {
        sensitivity: "base",
        numeric: true
      }
    ) * multiplier;
  });

  groups.forEach(group => table.append(group));

  const headers = table.querySelectorAll("thead th");

  headers.forEach(header => {
    header.removeAttribute("aria-sort");
  });

  headers[columnIndex].setAttribute(
    "aria-sort",
    direction
  );
}


// Styling

function injectEnhancedStyles() {
  if (document.querySelector("#mal-people-enhancer-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "mal-people-enhancer-styles";

  style.textContent = `
    #mal-people-enhanced-roles {
      margin-bottom: 24px;
    }

    .mal-enhanced-table {
      width: 100%;
      border-collapse: collapse;
    }

    .mal-enhanced-table th,
    .mal-enhanced-table td {
      padding: 8px;
      border: 1px solid;
      border-color: currentColor;
      text-align: left;
      vertical-align: middle;
    }

    .mal-sort-button {
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-weight: bold;
      text-align: left;
      cursor: pointer;
    }

    th[aria-sort="ascending"]
      .mal-sort-indicator::after {
      content: "▲";
    }

    th[aria-sort="descending"]
      .mal-sort-indicator::after {
      content: "▼";
    }

    .mal-character-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mal-character-portrait {
      width: 42px;
      height: 62px;
      object-fit: cover;
      flex: 0 0 auto;
    }

    .mal-entries-toggle {
      margin-left: 4px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-decoration: underline;
    }

    .mal-entry-list {
      display: grid;
      gap: 4px;
      padding: 4px 8px;
    }
  `;

  document.head.append(style);
}

// Diagnostic code
try {
  const parsedRows = parseRoles();
  const groupedRoles = groupRoles(parsedRows);

  injectEnhancedStyles();
  injectEnhancedTable(groupedRoles);

  console.log(
    `MAL People Page Enhancer injected ` +
    `${groupedRoles.length} grouped roles from ` +
    `${parsedRows.length} appearances.`
  );
  
	console.table(
	  groupedRoles.map(role => ({
		character: role.characterName,
		classification: classifyCharacter(
		  role.appearances
		),
		appearances: role.appearances.length,
		main: role.appearances.filter(
		  appearance => appearance.roleType === "Main"
		).length,
		supporting: role.appearances.filter(
		  appearance => appearance.roleType === "Supporting"
		).length
	  }))
	);  
  
} catch (error) {
  console.error(
    "MAL People Page Enhancer failed:",
    error
  );
}

