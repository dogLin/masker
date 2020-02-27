import { STATE, def, warn, validValue } from './shared'  //  一些共享的方法以及全局状态
import { storeSave } from './store'  // 缓存原掩码
import { getRule } from './rule' // 获取规则
import request from './request'

// 拦截标记, 表示已经注册过的Keys
export const TAG = getSymbol('__traced__')
// 状态值
// 已发过请求了
export const AJAXING = getSymbol('__value_has_been_ajaxed__')
// 原始值被修改了,需要更新真实值
export const RESET = getSymbol('__value_has_been_reset__')
// 请求失败了
export const FAILD = getSymbol('__get_value_faild__')
// 用户没有设置请求url
export const UNSET_URL = getSymbol('__no_url_to_go__')
// 寄存对象的标记, 在拦截过的对象原型链上
export const STORE_TAG = getSymbol('__masker_store__')

function getSymbol(string) {
  return window && window.Symbol ? Symbol(string) : string
}


// 拦截对象对应的key
export default function intercept(obj, key, rule) {
  storeSave(obj, key, obj[key])
  // 拦截过对象
  if (obj[TAG]) {
    // 也拦截过键
    if (obj[TAG][key]) {
      // 更新到最新的group
      obj[TAG][key] = STATE.GroupId
      return
    }
    obj[TAG][key] = STATE.GroupId
  } else {
    // 首次
    def(obj, TAG, { [key]: STATE.GroupId })
  }
  defProxy(obj, key, obj[key], rule)
}

/**
 * 拦截对象属性
 * @param {*} obj 目标对象
 * @param {*} key 拦截的键
 * @param {*} oldVal 原始值
 */
function defProxy(obj, key, oldVal, rule) {
  const property = Object.getOwnPropertyDescriptor(obj, key)
  const getter = property && property.get
  const setter = property && property.set
  const tag = obj[TAG]

  // 真实数据
  let realVal = null

  const getCur = getter ? () => getter.call(obj) + '' : () => oldVal + ''

  const reject = () => {
    realVal = FAILD
  }

  const resolve = (response) => {
    if (!realVal || realVal === AJAXING) {
      realVal = response
    }
  }

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      const curVal = getCur()
      // 功能停止
      if (STATE.Sleeping) {
        return curVal
      }
      // 加入了严格模式，可能会存在没有合适的rule，只能直接展示了
      if (!rule) {
        return curVal
      }
      // 只有是当前分组且格式化规则类型需要允许请求的才进行切换控制
      if (tag[key] === STATE.GroupId && STATE.ShowReal) {
        if (rule.request === false) {
          return curVal
        }
        if (STATE.ShowReal && realVal !== AJAXING && realVal !== FAILD) {
          /**
           * 全局切换控制展示规则
           * 1. 若已在请求中, 直接返回foramtedVal,等待请求完成后进一步判断
           * 2. 请求失败的,直接返回foramtedVal, 清空realVal,等待下一次get
           * 3. 请求中又被重设的,该次请求结果跳过,清空realVal,等待下一次get
           * 4. 请求成功,存下并刷新视图显示realVal,除非set了新的value否则切换就取已存的realVal
           */
          if (!realVal || realVal === RESET) {
            realVal = AJAXING
            // 装入小组中等待统一更新
            request({
              value: curVal,
              type: rule.type,
              resolve,
              reject
            })
          } else {
            return realVal
          }
        }
      }
      // 请求出错后只显示原值, 在下一次触发时再求值
      if (realVal === FAILD) {
        realVal = null
      }
      return rule.format(curVal)
    },
    set(setVal) {
      if (validValue(setVal)) {
        const curVal = getCur()
        // eslint-disable-next-line
        if (setVal === curVal || (setVal !== setVal && curVal !== curVal)) {
          // for NaN
          return
        }

        // 值变了, 对应的真实值要重新获取
        realVal = RESET
        // 更新新值对应的替换规则
        rule = getRule(getCur(), key)

        if (setter) {
          setter.call(obj, setVal)
        } else {
          oldVal = setVal
        }

        storeSave(obj, key, setVal)
      } else {
        warn(`the key [${key}] must be string|number, skip set`)
      }
    }
  })
}

 * @param {*} oldVal 原始值
 */
function defProxy(obj, key, oldVal, rule) {
  const property = Object.getOwnPropertyDescriptor(obj, key)
  const getter = property && property.get
  const setter = property && property.set
  const tag = obj[TAG]

  // 真实数据
  let realVal = null

  const getCur = getter ? () => getter.call(obj) + '' : () => oldVal + ''

  const reject = () => {
    realVal = FAILD
  }

  const resolve = (response) => {
    if (!realVal || realVal === AJAXING) {
      realVal = response
    }
  }

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      const curVal = getCur()
      // 功能停止
      if (STATE.Sleeping) {
        return curVal
      }
      // 加入了严格模式，可能会存在没有合适的rule，只能直接展示了
      if (!rule) {
        return curVal
      }
      // 只有是当前分组且格式化规则类型需要允许请求的才进行切换控制
      if (tag[key] === STATE.GroupId && STATE.ShowReal) {
        if (rule.request === false) {
          return curVal
        }
        if (STATE.ShowReal && realVal !== AJAXING && realVal !== FAILD) {
          /**
           * 全局切换控制展示规则
           * 1. 若已在请求中, 直接返回foramtedVal,等待请求完成后进一步判断
           * 2. 请求失败的,直接返回foramtedVal, 清空realVal,等待下一次get
           * 3. 请求中又被重设的,该次请求结果跳过,清空realVal,等待下一次get
           * 4. 请求成功,存下并刷新视图显示realVal,除非set了新的value否则切换就取已存的realVal
           */
          if (!realVal || realVal === RESET) {
            realVal = AJAXING
            // 装入小组中等待统一更新
            request({
              value: curVal,
              type: rule.type,
              resolve,
              reject
            })
          } else {
            return realVal
          }
        }
      }
      // 请求出错后只显示原值, 在下一次触发时再求值
      if (realVal === FAILD) {
        realVal = null
      }
      return rule.format(curVal)
    },
    set(setVal) {
      if (validValue(setVal)) {
        const curVal = getCur()
        // eslint-disable-next-line
        if (setVal === curVal || (setVal !== setVal && curVal !== curVal)) {
          // for NaN
          return
        }

        // 值变了, 对应的真实值要重新获取
        realVal = RESET
        // 更新新值对应的替换规则
        rule = getRule(getCur(), key)

        if (setter) {
          setter.call(obj, setVal)
        } else {
          oldVal = setVal
        }

        storeSave(obj, key, setVal)
      } else {
        warn(`the key [${key}] must be string|number, skip set`)
      }
    }
  })
}
