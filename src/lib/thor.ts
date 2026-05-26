import {
  decodeFunctionResult,
  encodeFunctionData,
  type Abi,
  type AbiStateMutability,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type ContractFunctionReturnType,
  type DecodeFunctionResultParameters,
  type EncodeFunctionDataParameters,
  type Hex,
} from 'viem'

export type ReadCall<T> = {
  to: Address
  data: Hex
  decode: (data: Hex) => T
}

type ThorReadResult = {
  data?: Hex
}

type ReadFunctionArgs<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi>,
> = ContractFunctionArgs<TAbi, AbiStateMutability, TFunctionName>

const trimNodeUrl = (nodeUrl: string) => nodeUrl.replace(/\/+$/, '')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isThorReadResultArray = (value: unknown): value is ThorReadResult[] => {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((item) => {
    if (!isRecord(item)) {
      return false
    }
    const data = item.data
    return data === undefined || (typeof data === 'string' && data.startsWith('0x'))
  })
}

export function makeReadCall<
  const TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi>,
>(
  to: Address,
  abi: TAbi,
  functionName: TFunctionName,
  args: ReadFunctionArgs<TAbi, TFunctionName>,
): ReadCall<ContractFunctionReturnType<TAbi, AbiStateMutability, TFunctionName>> {
  const encodeParameters = {
    abi,
    functionName,
    args,
  } as unknown as EncodeFunctionDataParameters<TAbi, TFunctionName>
  const buildDecodeParameters = (data: Hex) =>
    ({
      abi,
      functionName,
      data,
    }) as unknown as DecodeFunctionResultParameters<TAbi, TFunctionName, ReadFunctionArgs<TAbi, TFunctionName>>

  return {
    to,
    data: encodeFunctionData<TAbi, TFunctionName>(encodeParameters),
    decode: (data) =>
      decodeFunctionResult<TAbi, TFunctionName, ReadFunctionArgs<TAbi, TFunctionName>>(
        buildDecodeParameters(data),
      ) as ContractFunctionReturnType<TAbi, AbiStateMutability, TFunctionName>,
  }
}

export async function executeReadCalls<T>(
  nodeUrl: string,
  calls: readonly ReadCall<T>[],
  chunkSize = 25,
): Promise<T[]> {
  const results: T[] = []

  for (let index = 0; index < calls.length; index += chunkSize) {
    const chunk = calls.slice(index, index + chunkSize)
    const response = await fetch(`${trimNodeUrl(nodeUrl)}/accounts/*`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clauses: chunk.map((call) => ({
          to: call.to,
          value: '0x0',
          data: call.data,
        })),
      }),
    })

    if (!response.ok) {
      throw new Error(`You need to use a working VeChain node. Read failed: ${response.statusText}`)
    }

    const payload = (await response.json()) as unknown
    if (!isThorReadResultArray(payload)) {
      throw new Error('You need to use a VeChain node with Thor REST account calls.')
    }

    payload.forEach((result, resultIndex) => {
      const data = result.data
      if (!data || data === '0x') {
        throw new Error(`Contract read ${index + resultIndex} returned empty data.`)
      }
      const call = chunk[resultIndex]
      if (!call) {
        throw new Error('Contract read response count mismatch.')
      }
      results.push(call.decode(data))
    })
  }

  return results
}

export async function executeReadCall<T>(nodeUrl: string, call: ReadCall<T>): Promise<T> {
  const [result] = await executeReadCalls(nodeUrl, [call], 1)
  if (result === undefined) {
    throw new Error('Contract read returned no result.')
  }
  return result
}

export async function getNativeVetBalance(nodeUrl: string, address: Address): Promise<bigint> {
  const response = await fetch(`${trimNodeUrl(nodeUrl)}/accounts/${address}`)
  if (!response.ok) {
    throw new Error(`You need to use a working VeChain node. Account read failed: ${response.statusText}`)
  }

  const payload = (await response.json()) as unknown
  if (!isRecord(payload)) {
    throw new Error('Account read returned invalid data.')
  }

  const balance = payload.balance
  if (typeof balance !== 'string') {
    return 0n
  }

  return BigInt(balance)
}
