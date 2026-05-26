import { parseAbi } from 'viem'

export const poolAbi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function getPoolAddress(uint256 tokenId) view returns (address)',
])

export const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
])

export const vot3Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function convertToB3TR(uint256 amount)',
])

export const poolExecuteAbi = parseAbi([
  'function execute(address to, uint256 value, bytes data, uint256 operation)',
])

export const lockedTermsAbi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function termInterval() view returns (uint256)',
  'function getTokenMetadata(uint256 tokenId) view returns ((address minter,uint256 amount,uint256 veDelegatePoolTokenId,uint256 optionId,uint256 startTime,bool autoRenew,bool isActive,uint256 creationRoundId,uint256 lastModifiedRoundId))',
  'function getOption(uint256 optionId) view returns ((uint256 timeLength,uint256 multiplier,uint256 balance,bool isActive))',
  'function setAutoRenew(uint256 tokenId, bool autoRenew)',
  'function closeTerm(uint256 tokenId)',
  'function withdrawFundsFrom(uint256 tokenId)',
])
