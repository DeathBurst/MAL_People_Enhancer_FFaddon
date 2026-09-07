/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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


function parseMobileRoles() {
  const rolesSection = document.querySelector("#roles");

  if (!rolesSection) {
    throw new ParseError(
      "Could not find the mobile Voice Acting Roles section."
    );
  }

  const roleElements = Array.from(
    rolesSection.querySelectorAll(".va-slider-items")
  ).filter(
    element =>
      element.querySelectorAll(
        ":scope > .va-slider-item"
      ).length === 2
  );

  if (roleElements.length === 0) {
    throw new ParseError(
      "Mobile Voice Acting Roles section contains no recognizable entries."
    );
  }

  return roleElements.map((element, index) => {
    try {
      return parseMobileRole(element, index);
    } catch (error) {
      if (error instanceof ParseError) {
        throw new ParseError(
          `Unable to parse mobile role entry ${index + 1}: ` +
          error.message
        );
      }

      throw error;
    }
  });
}


function parseMobileRole(roleElement, sourceOrder) {
  const items = Array.from(roleElement.children).filter(
    child => child.classList.contains("va-slider-item")
  );

  if (items.length !== 2) {
    throw new ParseError(
      `Expected 2 mobile role items, found ${items.length}.`
    );
  }

  const [characterItem, entryItem] = items;

  const characterLink = characterItem.querySelector(
    'a.img-link[href*="/character/"]'
  );

  if (!characterLink) {
    throw new ParseError("Character link not found.");
  }

  const characterUrl = requiredUrl(
    characterLink,
    "character"
  );

  const characterNameElement = characterItem.querySelector(
    "h3.va-slider-item__title"
  );

  if (!characterNameElement) {
    throw new ParseError("Character name not found.");
  }

  const characterName =
    characterNameElement.textContent.trim();

  if (!characterName) {
    throw new ParseError("Character name is empty.");
  }

  const characterImageUrl =
    extractMobileCharacterImageUrl(characterItem);

  const favorites =
    extractMobileFavorites(characterItem);

  const entryLink = entryItem.querySelector(
    'a.va-slider-item__title[href*="/anime/"]'
  );

  if (!entryLink) {
    throw new ParseError("Anime entry link not found.");
  }

  const {
    url: entryUrl,
    name: entryTitle
  } = extractUrlName(entryLink, "entry");

  return {
    characterName,
    characterUrl,
    characterImageUrl,
    favorites,

    entryTitle,
    entryUrl,

    /*
     * This records mobile DOM order only. It is alphabetical by
     * anime title and must not be treated as chronology.
     */
    sourceOrder
  };
}


function extractMobileCharacterImageUrl(characterItem) {
  const image = characterItem.querySelector(
    'a.img-link[href*="/character/"] img'
  );

  if (!image) {
    throw new ParseError(
      "Character portrait element not found."
    );
  }

  const imageUrl =
    image.getAttribute("data-src") ||
    image.getAttribute("src");

  if (!imageUrl || !imageUrl.trim()) {
    throw new ParseError(
      "Character portrait has no usable URL."
    );
  }

  return new URL(
    imageUrl,
    document.baseURI
  ).href;
}


function extractMobileFavorites(characterItem) {
  const element = characterItem.querySelector(
    ".js-favorite-users"
  );

  if (!element) {
    throw new ParseError(
      "Character favorites element not found."
    );
  }

  const rawValue = (
    element.getAttribute("data-users") ||
    element.textContent
  )
    .replaceAll(",", "")
    .replace(/\D/g, "");

  if (!rawValue) {
    throw new ParseError(
      "Character favorites value is invalid."
    );
  }

  return Number.parseInt(rawValue, 10);
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
    role.franchise = detectFranchise(role.appearances);
  }

  groupedRoles.sort(compareGroupedRoles);

  return groupedRoles;
}

function groupMobileRoles(rows) {
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
      validateMobileCharacterMetadata(
        groupedRole,
        row
      );
    }

    groupedRole.appearances.push({
      characterUrl: row.characterUrl,
      entryTitle: row.entryTitle,
      entryUrl: row.entryUrl,
      sourceOrder: row.sourceOrder
    });
  }

  const groupedRoles = Array.from(
    grouped.values()
  );

  for (const role of groupedRoles) {
    role.franchise = detectFranchise(
      role.appearances,
      compareMobileAppearances,
	  false
    );
  }

  groupedRoles.sort(compareMobileGroupedRoles);

  return groupedRoles;
}

function validateMobileCharacterMetadata(
  groupedRole,
  row
) {
  if (row.characterName !== groupedRole.characterName) {
    throw new GroupingError(
      `Inconsistent character names for ` +
      `${row.characterUrl}: ` +
      `${JSON.stringify(groupedRole.characterName)} and ` +
      `${JSON.stringify(row.characterName)}.`
    );
  }

  if (row.favorites !== groupedRole.favorites) {
    throw new GroupingError(
      `Inconsistent favorite counts for ` +
      `${row.characterUrl}: ` +
      `${groupedRole.favorites} and ${row.favorites}.`
    );
  }

  if (
    row.characterImageUrl !==
    groupedRole.characterImageUrl
  ) {
    throw new GroupingError(
      `Inconsistent character portraits for ` +
      `${row.characterUrl}: ` +
      `${JSON.stringify(groupedRole.characterImageUrl)} and ` +
      `${JSON.stringify(row.characterImageUrl)}.`
    );
  }
}

function compareMobileGroupedRoles(left, right) {
  const favoriteDifference =
    right.favorites - left.favorites;

  if (favoriteDifference !== 0) {
    return favoriteDifference;
  }

  return (
    right.appearances.length -
    left.appearances.length
  );
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

function compareMobileAppearances(left, right) {
  return left.sourceOrder - right.sourceOrder;
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

// Franchise detection

const AMBIGUOUS_FRANCHISE = "!!! TWO TIED NAMES !!!";

function tokenizeTitle(title) {
  return Array.from(
    title.matchAll(
      /[\p{L}\p{N}]+|[^\p{L}\p{N}\s]/gu
    ),
    match => ({
      normalized: match[0].toLocaleLowerCase(),
      start: match.index,
      end: match.index + match[0].length
    })
  );
}

function findCandidatesToken(titles) {
  const tokenizedTitles = titles.map(tokenizeTitle);
  const uniqueCandidates = new Map();

  for (
    let leftIndex = 0;
    leftIndex < tokenizedTitles.length;
    leftIndex++
  ) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < tokenizedTitles.length;
      rightIndex++
    ) {
      const pairCandidates = findCommonTokenSequences(
        tokenizedTitles[leftIndex],
        tokenizedTitles[rightIndex]
      );

      for (const candidate of pairCandidates) {
        const key = candidate.join("\u0000");

        if (!uniqueCandidates.has(key)) {
          uniqueCandidates.set(key, candidate);
        }
      }
    }
  }

  return Array.from(uniqueCandidates.values());
}

function findCommonTokenSequences(leftTokens, rightTokens) {
  const uniqueCandidates = new Map();

  for (
    let leftStart = 0;
    leftStart < leftTokens.length;
    leftStart++
  ) {
    for (
      let rightStart = 0;
      rightStart < rightTokens.length;
      rightStart++
    ) {
      const candidate = [];

      for (
        let offset = 0;
        leftStart + offset < leftTokens.length &&
        rightStart + offset < rightTokens.length;
        offset++
      ) {
        const leftToken =
          leftTokens[leftStart + offset].normalized;

        const rightToken =
          rightTokens[rightStart + offset].normalized;

        if (leftToken !== rightToken) {
          break;
        }

        candidate.push(leftToken);

        if (!containsAlphanumericToken(candidate)) {
          continue;
        }

        const savedCandidate = [...candidate];
        const key = savedCandidate.join("\u0000");

        if (!uniqueCandidates.has(key)) {
          uniqueCandidates.set(key, savedCandidate);
        }
      }
    }
  }

  return Array.from(uniqueCandidates.values());
}


function containsAlphanumericToken(candidate) {
  return candidate.some(
    token => /[\p{L}\p{N}]/u.test(token)
  );
}




function deduplicateTokenCandidates(candidates) {
  const uniqueCandidates = new Map();

  for (const candidate of candidates) {
    const key = candidate.join("\u0000");

    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, candidate);
    }
  }

  return Array.from(uniqueCandidates.values());
}


function scoreCandidatesToken(candidates, titles) {
  const tokenizedTitles = titles.map(tokenizeTitle);

  return candidates.map(candidate => {
    const matchingPositions = [];

    for (const titleTokens of tokenizedTitles) {
      const startIndex = findTokenSequenceIndex(
        titleTokens,
        candidate
      );

      if (startIndex !== -1) {
        matchingPositions.push(startIndex);
      }
    }

    const averageStart =
      matchingPositions.reduce(
        (total, position) => total + position,
        0
      ) / matchingPositions.length;

    return {
      candidate,
      matches: matchingPositions.length,
      averageStart,
      characterLength: candidate.reduce(
        (total, token) => total + token.length,
        0
      )
    };
  });
}


function findTokenSequenceIndex(titleTokens, candidate) {
  if (
    candidate.length === 0 ||
    candidate.length > titleTokens.length
  ) {
    return -1;
  }

  for (
    let startIndex = 0;
    startIndex <= titleTokens.length - candidate.length;
    startIndex++
  ) {
    const matches = candidate.every(
      (candidateToken, offset) =>
        titleTokens[startIndex + offset].normalized ===
        candidateToken
    );

    if (matches) {
      return startIndex;
    }
  }

  return -1;
}




const EXACT_MATCH_BONUS = 2;
const EARLIEST_APPEARANCE_BONUS = 1;

function bestCandidate(
  scoredCandidates,
  appearances,
  appearanceComparator = compareAppearancesChronologically,
  useEarliestMatchBonus = true
) {	
  if (appearances.length === 0) {
    throw new GroupingError(
      "Cannot select a franchise name without appearances."
    );
  }

  const orderedAppearances = [...appearances].sort(
    appearanceComparator
  );

  const fallbackCandidate = tokenizeTitle(
    orderedAppearances[0].entryTitle
  ).map(token => token.normalized);

  if (scoredCandidates.length === 0) {
    return fallbackCandidate;
  }

  const rankedCandidates = scoredCandidates
    .filter(
      scored =>
        scored.matches / appearances.length >= 0.4
    )
    .sort(compareInitialCandidateRanking)
    .map((scored, index) => ({
      ...scored,
      initialRank: index
    }));

  if (rankedCandidates.length === 0) {
    return fallbackCandidate;
  }

  rankedCandidates.reverse();

  let winner = rankedCandidates[0];

  for (
    let index = 1;
    index < rankedCandidates.length;
    index++
  ) {
    winner = duelCandidates(
      winner,
      rankedCandidates[index],
      orderedAppearances,
      useEarliestMatchBonus
    );
  }

  return winner.candidate;
}

function compareInitialCandidateRanking(left, right) {
  if (left.matches !== right.matches) {
    return right.matches - left.matches;
  }

  return right.characterLength - left.characterLength;
}


function duelCandidates(
  currentWinner,
  challenger,
  orderedAppearances,
  useEarliestMatchBonus
) {	
  const nested = areCandidatesNested(
    currentWinner.candidate,
    challenger.candidate
  );

  if (nested) {
    return duelNestedCandidates(
      currentWinner,
      challenger,
      orderedAppearances,
      useEarliestMatchBonus
    );
  }

  return duelIndependentCandidates(
    currentWinner,
    challenger,
    orderedAppearances
  );
}


function duelIndependentCandidates(
  currentWinner,
  challenger,
  chronologicalAppearances
) {
  if (
    currentWinner.averageStart <
    challenger.averageStart
  ) {
    return currentWinner;
  }

  if (
    challenger.averageStart <
    currentWinner.averageStart
  ) {
    return challenger;
  }

  const earliestWinners = candidatesMatchingEarliestEntry(
    [currentWinner, challenger],
    chronologicalAppearances
  );

  if (earliestWinners.length === 1) {
    return earliestWinners[0];
  }

  return initialRankingWinner(
    currentWinner,
    challenger
  );
}


function duelNestedCandidates(
  currentWinner,
  challenger,
  orderedAppearances,
  useEarliestMatchBonus
) {	
  let winnerPoints = 0;
  let challengerPoints = 0;

  if (
    candidateExactlyMatchesAnyEntry(
      currentWinner.candidate,
      orderedAppearances
    )
  ) {
    winnerPoints += EXACT_MATCH_BONUS;
  }

  if (
    candidateExactlyMatchesAnyEntry(
      challenger.candidate,
      orderedAppearances
    )
  ) {
    challengerPoints += EXACT_MATCH_BONUS;
  }

  const coverageDifference =
    currentWinner.matches - challenger.matches;

  if (coverageDifference > 0) {
    winnerPoints += coverageDifference;
  } else if (coverageDifference < 0) {
    challengerPoints += -coverageDifference;
  }

  const winnerAlphanumericTokens =
    countAlphanumericTokens(
      currentWinner.candidate
    );

  const challengerAlphanumericTokens =
    countAlphanumericTokens(
      challenger.candidate
    );

  const tokenDifference =
    winnerAlphanumericTokens -
    challengerAlphanumericTokens;

  if (tokenDifference > 0) {
    winnerPoints += tokenDifference;
  } else if (tokenDifference < 0) {
    challengerPoints += -tokenDifference;
  }

  if (useEarliestMatchBonus) {
    const earliestWinners = candidatesMatchingEarliestEntry(
      [currentWinner, challenger],
      orderedAppearances
    );
   
    if (earliestWinners.includes(currentWinner)) {
      winnerPoints += EARLIEST_APPEARANCE_BONUS;
    }
   
    if (earliestWinners.includes(challenger)) {
      challengerPoints += EARLIEST_APPEARANCE_BONUS;
    }
  }

  if (winnerPoints > challengerPoints) {
    return currentWinner;
  }

  if (challengerPoints > winnerPoints) {
    return challenger;
  }

  return initialRankingWinner(
    currentWinner,
    challenger
  );
}


function areCandidatesNested(leftCandidate, rightCandidate) {
  return (
    containsCandidateSequence(
      leftCandidate,
      rightCandidate
    ) ||
    containsCandidateSequence(
      rightCandidate,
      leftCandidate
    )
  );
}


function containsCandidateSequence(
  outerCandidate,
  innerCandidate
) {
  if (
    innerCandidate.length === 0 ||
    innerCandidate.length > outerCandidate.length
  ) {
    return false;
  }

  for (
    let startIndex = 0;
    startIndex <=
      outerCandidate.length - innerCandidate.length;
    startIndex++
  ) {
    const matches = innerCandidate.every(
      (token, offset) =>
        outerCandidate[startIndex + offset] === token
    );

    if (matches) {
      return true;
    }
  }

  return false;
}


function candidateExactlyMatchesAnyEntry(
  candidate,
  appearances
) {
  return appearances.some(appearance => {
    const titleTokens = tokenizeTitle(
      appearance.entryTitle
    ).map(token => token.normalized);

    return tokenSequencesAreEqual(
      candidate,
      titleTokens
    );
  });
}


function tokenSequencesAreEqual(left, right) {
  return (
    left.length === right.length &&
    left.every(
      (token, index) => token === right[index]
    )
  );
}


function countAlphanumericTokens(candidate) {
  return candidate.filter(
    token => /^[\p{L}\p{N}]+$/u.test(token)
  ).length;
}


function candidatesMatchingEarliestEntry(
  candidates,
  chronologicalAppearances
) {
  for (const appearance of chronologicalAppearances) {
    const titleTokens = tokenizeTitle(
      appearance.entryTitle
    );

    const matchingCandidates = candidates.filter(
      scored =>
        findTokenSequenceIndex(
          titleTokens,
          scored.candidate
        ) !== -1
    );

    if (matchingCandidates.length > 0) {
      return matchingCandidates;
    }
  }

  throw new GroupingError(
    "No chronological appearance matches either " +
    "franchise candidate."
  );
}


function initialRankingWinner(left, right) {
  return left.initialRank <= right.initialRank
    ? left
    : right;
}


function isAlphanumericToken(token) {
  return /^[\p{L}\p{N}]+$/u.test(token);
}



function recoverCandidateFormatting(candidate, titles) {
  for (const title of titles) {
    const titleTokens = tokenizeTitle(title);

    const startIndex = findTokenSequenceIndex(
      titleTokens,
      candidate
    );

    if (startIndex === -1) {
      continue;
    }

    const firstToken = titleTokens[startIndex];

    const lastToken =
      titleTokens[startIndex + candidate.length - 1];

    return title
      .slice(firstToken.start, lastToken.end)
      .trim();
  }

  throw new GroupingError(
    "Could not recover formatting for candidate: " +
    JSON.stringify(candidate)
  );
}

function detectFranchise(
  appearances,
  appearanceComparator = compareAppearancesChronologically,
  useEarliestMatchBonus = true
) {
  if (appearances.length === 0) {
    throw new GroupingError(
      "Cannot detect a franchise without appearances."
    );
  }

  if (appearances.length === 1) {
    return appearances[0].entryTitle;
  }

  const titles = appearances.map(
    appearance => appearance.entryTitle
  );

  const candidates = findCandidatesToken(titles);

  const scoredCandidates = scoreCandidatesToken(
    candidates,
    titles
  );

  const candidate = bestCandidate(
    scoredCandidates,
    appearances,
    appearanceComparator,
    useEarliestMatchBonus
  );
  
  return recoverCandidateFormatting(
    candidate,
    titles
  );
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


function dateSortToDate(dateSort) {
  const raw = String(dateSort).padStart(8, "0");

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6)) || 1;
  const day = Number(raw.slice(6, 8)) || 1;

  return new Date(year, month - 1, day);
}


function formatDuration(startDateSort, endDateSort) {
  const start = dateSortToDate(startDateSort);
  const end = dateSortToDate(endDateSort);

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth();

  if (end.getDate() < start.getDate()) {
    months--;
  }

  months = Math.max(0, months);

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} months`;
  }

/*   if (remainingMonths === 0) {
    return `${years} years`;
  }

  return `${years} years, ${remainingMonths} months`;
 */
  if (remainingMonths < 7) {
    return `${years} years`;
  }
  return `${years+1} years`;
 
 }


function isWithinLastYear(dateSort) {
  const appearanceDate = dateSortToDate(dateSort);
  const oneYearAgo = new Date();

  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  return appearanceDate >= oneYearAgo;
}


function computeCareerMilestones(parsedRows) {
  if (parsedRows.length === 0) {
    throw new GroupingError(
      "Cannot compute career milestones without appearances."
    );
  }

  const chronologicalRows = [...parsedRows].sort(
    compareAppearancesChronologically
  );

  const firstRole = chronologicalRows[0];
  const lastRole = chronologicalRows.at(-1);

  const firstMainRole = chronologicalRows.find(
    appearance => appearance.roleType === "Main"
  );

  return {
    firstRole,
    firstMainRole,
    lastRole,
    timeToFirstMain: firstMainRole
      ? formatDuration(
          firstRole.dateSort,
          firstMainRole.dateSort
        )
      : null,
    careerDuration: formatDuration(
      firstRole.dateSort,
      lastRole.dateSort
    ),
    ongoing: isWithinLastYear(lastRole.dateSort)
  };
}

function injectEnhancedTable(groupedRoles, parsedRows) {
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
    `${classificationCounts.Supporting} Supporting` +
	` (${((classificationCounts.Main / groupedRoles.length) * 100).toFixed(0)}% Main)`;

    const milestones = computeCareerMilestones(parsedRows);
    
    const milestoneSummary = document.createElement("p");
    
    const firstRoleText =
      formatAppearancePeriod(milestones.firstRole);
    
    const lastRoleText =
      formatAppearancePeriod(milestones.lastRole);
    
    const firstMainText = milestones.firstMainRole
      ? (
          `${formatAppearancePeriod(milestones.firstMainRole)} ` +
          `after ${milestones.timeToFirstMain}`
        )
      : "none";
    
    milestoneSummary.textContent =
      `First role: ${firstRoleText} · ` +
      `First Main role: ${firstMainText} · ` +
      `Last role: ${lastRoleText} · ` +
      `Career span: ${milestones.careerDuration}` +
      (milestones.ongoing ? " · ongoing" : "");
	  
	milestoneSummary.replaceChildren(
	  `Career: ${firstRoleText} to ${lastRoleText} (${milestones.careerDuration}${(milestones.ongoing ? ", ongoing" : "")})`,
	  document.createElement("br"),
	  `First Main role: ${firstMainText}`,
	  )

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

  container.append(heading, summary, milestoneSummary, table);

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

  const textWrapper = document.createElement("div");
  textWrapper.className = "mal-character-text";

  const characterLink = document.createElement("a");
  characterLink.href = role.characterUrl;
  characterLink.textContent = role.characterName;

  const franchise = document.createElement("div");
  franchise.className = "mal-character-franchise";
  franchise.textContent = role.franchise;

  textWrapper.append(characterLink, franchise);
  wrapper.append(portrait, textWrapper);
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


function injectMobileRoleList(groupedRoles) {
  const originalHeading = document.querySelector(
    'h2[data-id="roles"]'
  );
  
  const originalRoles = document.querySelector("#roles");
  
  if (!originalHeading || !originalRoles) {
    throw new ParseError(
      "Could not find the mobile Voice Acting Roles section."
    );
  }
  
  document
    .querySelector("#mal-mobile-enhanced-roles")
    ?.remove();

  const container = document.createElement("div");
  container.id = "mal-mobile-enhanced-roles";

  const heading = document.createElement("h2");
  // A sticky element needs an opaque background.
  // Since we want MAL’s actual current theme color,
  // set it from JavaScript rather than guessing.
  const originalHeadingStyle =
    window.getComputedStyle(originalHeading);
  
  heading.style.backgroundColor =
    originalHeadingStyle.backgroundColor;
  
  heading.style.color =
    originalHeadingStyle.color;
  // If MAL’s heading background is transparent, use page background instead:
  if (
    originalHeadingStyle.backgroundColor ===
    "rgba(0, 0, 0, 0)"
  ) {
    heading.style.backgroundColor =
      window.getComputedStyle(document.body)
        .backgroundColor;
  }

  heading.className =
    "header3 btn-toggle-detail pt16 pb16 " +
    "mal-mobile-enhanced-header open";
  heading.textContent = "Voice Acting Roles (enhanced)";
  heading.tabIndex = 0;
  heading.setAttribute("role", "button");
  heading.setAttribute("aria-expanded", "true");
  
  const content = document.createElement("div");
  content.className = "mal-mobile-enhanced-content";
  
  const summary = document.createElement("p");
  summary.className = "mal-mobile-summary";
  summary.textContent =
    `${groupedRoles.length} distinct roles`;
  
  const roleList = document.createElement("div");
  roleList.className = "mal-mobile-role-list";

  for (const role of groupedRoles) {
    roleList.append(
      renderMobileRoleCard(role)
    );
  }

  content.append(summary, roleList);
  container.append(heading, content);
  
  originalHeading.parentNode.insertBefore(
    container,
    originalHeading
  );
  
  const stickySentinel = document.createElement("div");
  stickySentinel.className = "mal-mobile-sticky-sentinel";
  
  container.before(stickySentinel);
  
  const siteHeader = document.querySelector("#header");
  
  function updateEnhancedHeaderPosition() {
    const siteHeaderHeight = siteHeader
      ? siteHeader.getBoundingClientRect().height
      : 0;
  
    const sentinelTop =
      stickySentinel.getBoundingClientRect().top;
  
    const originalHeadingTop =
      originalHeading.getBoundingClientRect().top;
    
    const shouldStick =
      !content.hidden &&
      sentinelTop <= siteHeaderHeight &&
      originalHeadingTop > siteHeaderHeight;

  
    heading.classList.toggle(
      "is-stuck",
      shouldStick
    );
  
    if (shouldStick) {
      heading.style.top = `${siteHeaderHeight}px`;
      stickySentinel.style.height =
        `${heading.getBoundingClientRect().height}px`;
    } else {
      heading.style.top = "";
      stickySentinel.style.height = "0";
    }
  }

window.addEventListener(
  "scroll",
  updateEnhancedHeaderPosition,
  { passive: true }
);

window.addEventListener(
  "resize",
  updateEnhancedHeaderPosition
);

updateEnhancedHeaderPosition();
  
  function toggleEnhancedRoles() {
    const isExpanded =
      heading.getAttribute("aria-expanded") === "true";
  
    content.hidden = isExpanded;
  
    heading.setAttribute(
      "aria-expanded",
      String(!isExpanded)
    );
  
    heading.classList.toggle("open", !isExpanded);
	updateEnhancedHeaderPosition();
  }
  
  heading.addEventListener(
    "click",
    toggleEnhancedRoles
  );
  
  heading.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleEnhancedRoles();
    }
  });
  
  originalRoles.hidden = true;
}

function renderMobileRoleCard(role) {
  const card = document.createElement("section");
  card.className = "mal-mobile-role-card";

  const header = document.createElement("div");
  header.className = "mal-mobile-role-header";

  const portraitLink = document.createElement("a");
  portraitLink.href = role.characterUrl;

  const portrait = document.createElement("img");
  portrait.className = "mal-mobile-character-portrait";
  portrait.src = role.characterImageUrl;
  portrait.alt = "";
  portrait.loading = "lazy";

  portraitLink.append(portrait);

  const information = document.createElement("div");
  information.className = "mal-mobile-role-information";

  const characterLink = document.createElement("a");
  characterLink.className = "mal-mobile-character-name";
  characterLink.href = role.characterUrl;
  characterLink.textContent = role.characterName;

  const metadata = document.createElement("div");
  metadata.className = "mal-mobile-role-metadata";

  const appearanceCount = role.appearances.length;
  const appearanceLabel =
    appearanceCount === 1
      ? "appearance"
      : "appearances";

  metadata.textContent =
    `${role.favorites.toLocaleString()} favorites · ` +
    `${appearanceCount} ${appearanceLabel}`;

  const franchise = document.createElement("div");
  franchise.className = "mal-mobile-franchise";
  franchise.textContent = role.franchise;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mal-mobile-entries-toggle";
  toggle.textContent = "Show entries";
  toggle.setAttribute("aria-expanded", "false");

  information.append(
    characterLink,
    franchise,
    metadata,
    toggle
  );

  header.append(portraitLink, information);

  const entries = document.createElement("div");
  entries.className = "mal-mobile-entry-list";
  entries.hidden = true;

  for (const appearance of role.appearances) {
    entries.append(
      renderMobileAppearance(appearance)
    );
  }

  toggle.addEventListener("click", () => {
    const isExpanded =
      toggle.getAttribute("aria-expanded") === "true";

    entries.hidden = isExpanded;

    toggle.setAttribute(
      "aria-expanded",
      String(!isExpanded)
    );

    toggle.textContent = isExpanded
      ? "Show entries"
      : "Hide entries";
  });

  card.append(header, entries);

  return card;
}

function renderMobileAppearance(appearance) {
  const line = document.createElement("div");
  line.className = "mal-mobile-entry";

  const link = document.createElement("a");
  link.href = appearance.entryUrl;
  link.textContent = appearance.entryTitle;

  line.append(link);

  return line;
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
	
	
	.mal-character-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .mal-character-franchise {
      margin-top: 3px;
      font-size: 0.9em;
      opacity: 0.75;
    }
	
	
    #mal-mobile-enhanced-roles {
      margin-bottom: 16px;
    }
    

    .mal-mobile-enhanced-header {
      margin: 0;
      cursor: pointer;
    }
    
    .mal-mobile-enhanced-header.is-stuck {
      position: fixed;
      top: 48px;
      left: 0;
      right: 0;
      z-index: 9998;
    }	
	
    .mal-mobile-summary {
      margin: 8px 0;
      font-weight: bold;
    }
    
    .mal-mobile-role-list {
      display: flex;
      flex-direction: column;
    }
    
    .mal-mobile-role-card {
      padding: 2px 0;
      border-bottom: 1px solid currentColor;
    }
    
    .mal-mobile-role-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    
    .mal-mobile-role-header > a {
      display: block;
      line-height: 0;
    }
    
    .mal-mobile-character-portrait {
      display: block;
      width: 72px;
      height: 88px;
      object-fit: cover;
      flex: 0 0 auto;
    }
    
    .mal-mobile-role-information {
      min-width: 0;
      flex: 1;
      align-self: stretch;
    
      display: flex;
      flex-direction: column;
	  
	  font-size: 13px;
	  line-height: 1.35;
    }
    
    .mal-mobile-character-name {
      display: block;
      font-weight: bold;
      font-size: 1.1em;
	  line-height: 1.35;
    }
    
    .mal-mobile-role-metadata {
      margin-top: 3px;
    }
    
    .mal-mobile-franchise {
      margin-top: 3px;
      opacity: 0.85;
      font-size: 1.05em;
    }
    
    .mal-mobile-entries-toggle {
      align-self: flex-start;
	  margin-top: auto;
	  margin-left: 25%;
	  margin-bottom: 4px;
	  
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    
    .mal-mobile-entry-list {
      margin: 10px 0 0 10px;
    }
    
    .mal-mobile-entry {
      padding: 4px 0;
    }
  `;

  document.head.append(style);
}

// Main init block
try {
  injectEnhancedStyles();

  const isMobileLayout = Boolean(
    document.querySelector(
      '#roles .va-slider-container .va-slider-items'
    )
  );
  
  if (isMobileLayout) {
    const parsedRows = parseMobileRoles();
    const groupedRoles = groupMobileRoles(parsedRows);

    injectMobileRoleList(groupedRoles);

    console.log(
      `MAL People Page Enhancer injected ` +
      `${groupedRoles.length} grouped mobile roles from ` +
      `${parsedRows.length} appearances.`
    );
  } else {
    const parsedRows = parseRoles();
    const groupedRoles = groupRoles(parsedRows);

    injectEnhancedTable(groupedRoles, parsedRows);
	
    console.log(
      `MAL People Page Enhancer injected ` +
      `${groupedRoles.length} grouped desktop roles from ` +
      `${parsedRows.length} appearances.`
    );
  }
} catch (error) {
  console.error(
    "MAL People Page Enhancer failed:",
    error
  );
}