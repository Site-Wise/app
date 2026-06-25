<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="sw-h1 font-display text-xl sm:text-2xl font-bold text-ink dark:text-cream">{{ t('tools.title') }}</h1>
        <p class="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
          {{ t('tools.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Tool Selection Tabs -->
    <div class="mb-6">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tool in tools"
          :key="tool.id"
          @click="activeTool = tool.id"
          :class="[
            'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTool === tool.id
              ? 'bg-amber-500 text-ink hover:bg-amber-600'
              : 'bg-stone-100 dark:bg-ink-2 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-ink-3'
          ]"
        >
          <component :is="tool.icon" class="h-4 w-4 mr-2" />
          {{ t(tool.labelKey) }}
        </button>
      </div>
    </div>

    <!-- Tool Cards -->
    <div class="space-y-6">
      <!-- Rebar Weight Estimator -->
      <div v-show="activeTool === 'rebar'" class="card">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg mr-3">
              <Calculator class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h2 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('tools.rebarEstimator.title') }}</h2>
              <p class="text-sm text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.description') }}</p>
            </div>
          </div>
          <button @click="rebarCalc.clearAll()" class="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
            {{ t('common.clearAll') }}
          </button>
        </div>

        <!-- Rebar Entries -->
        <div class="space-y-4">
          <!-- Desktop Table Header -->
          <div class="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 bg-stone-50 dark:bg-ink-2 rounded-lg sw-eyebrow text-stone-600 dark:text-stone-300">
            <div class="col-span-2">{{ t('tools.rebarEstimator.diameter') }}</div>
            <div class="col-span-2">{{ t('tools.rebarEstimator.length') }}</div>
            <div class="col-span-2">{{ t('tools.rebarEstimator.quantity') }}</div>
            <div class="col-span-2 text-right">{{ t('tools.rebarEstimator.weightPerMeter') }}</div>
            <div class="col-span-2 text-right">{{ t('tools.rebarEstimator.weightPerBar') }}</div>
            <div class="col-span-2 text-right">{{ t('tools.rebarEstimator.totalWeight') }}</div>
          </div>

          <!-- Entry Rows -->
          <div v-for="(entry, index) in rebarCalc.entries.value" :key="entry.id" class="relative">
            <!-- Desktop Row -->
            <div class="hidden lg:grid lg:grid-cols-12 gap-4 items-center p-4 bg-white dark:bg-ink-3 border border-stone-200 dark:border-ink-4 rounded-lg">
              <div class="col-span-2">
                <select v-model.number="entry.diameter" class="input w-full">
                  <option v-for="d in rebarCalc.standardDiameters" :key="d" :value="d">{{ d }} mm</option>
                </select>
              </div>
              <div class="col-span-2">
                <div class="relative">
                  <input v-model.number="entry.length" type="number" step="0.1" min="0.1" class="input w-full pr-8" />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m</span>
                </div>
              </div>
              <div class="col-span-2">
                <input v-model.number="entry.quantity" type="number" min="1" class="input w-full" />
              </div>
              <div class="col-span-2 text-right text-sm font-mono sw-tabular text-stone-600 dark:text-stone-300">
                {{ formatNumber(rebarCalc.getCalculation(entry.id)?.weightPerMeter || 0) }} kg/m
              </div>
              <div class="col-span-2 text-right text-sm font-mono sw-tabular text-stone-600 dark:text-stone-300">
                {{ formatNumber(rebarCalc.getCalculation(entry.id)?.weightPerBar || 0) }} kg
              </div>
              <div class="col-span-2 flex items-center justify-end">
                <span class="text-sm font-semibold font-mono sw-tabular text-ink dark:text-cream mr-4">
                  {{ formatNumber(rebarCalc.getCalculation(entry.id)?.totalWeight || 0) }} kg
                </span>
                <button
                  v-if="rebarCalc.entries.value.length > 1"
                  @click="rebarCalc.removeEntry(entry.id)"
                  class="p-1 text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300 rounded"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Mobile Card -->
            <div class="lg:hidden p-4 bg-white dark:bg-ink-3 border border-stone-200 dark:border-ink-4 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.entry') }} #{{ index + 1 }}</span>
                <button v-if="rebarCalc.entries.value.length > 1" @click="rebarCalc.removeEntry(entry.id)" class="min-h-touch min-w-[44px] inline-flex items-center justify-center text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300 rounded">
                  <X class="h-4 w-4" />
                </button>
              </div>
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.rebarEstimator.diameter') }}</label>
                  <select v-model.number="entry.diameter" class="input w-full text-sm">
                    <option v-for="d in rebarCalc.standardDiameters" :key="d" :value="d">{{ d }} mm</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.rebarEstimator.length') }}</label>
                  <div class="relative">
                    <input v-model.number="entry.length" type="number" step="0.1" min="0.1" class="input w-full text-sm pr-6" />
                    <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400">m</span>
                  </div>
                </div>
                <div>
                  <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.rebarEstimator.quantity') }}</label>
                  <input v-model.number="entry.quantity" type="number" min="1" class="input w-full text-sm" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3 pt-3 border-t border-stone-200 dark:border-ink-4">
                <div>
                  <span class="block text-xs text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.perMeter') }}</span>
                  <span class="text-sm font-mono sw-tabular text-stone-700 dark:text-stone-300">{{ formatNumber(rebarCalc.getCalculation(entry.id)?.weightPerMeter || 0) }} kg</span>
                </div>
                <div>
                  <span class="block text-xs text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.perBar') }}</span>
                  <span class="text-sm font-mono sw-tabular text-stone-700 dark:text-stone-300">{{ formatNumber(rebarCalc.getCalculation(entry.id)?.weightPerBar || 0) }} kg</span>
                </div>
                <div>
                  <span class="block text-xs text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.total') }}</span>
                  <span class="text-sm font-semibold font-mono sw-tabular text-ink dark:text-cream">{{ formatNumber(rebarCalc.getCalculation(entry.id)?.totalWeight || 0) }} kg</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Entry Button -->
          <button @click="rebarCalc.addEntry()" class="w-full py-3 border-2 border-dashed border-stone-300 dark:border-ink-4 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors flex items-center justify-center">
            <Plus class="h-4 w-4 mr-2" />
            {{ t('tools.rebarEstimator.addEntry') }}
          </button>
        </div>

        <!-- Summary Section -->
        <div class="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center space-x-6">
              <div>
                <span class="block text-sm text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.totalBars') }}</span>
                <span class="sw-stat font-mono sw-tabular text-xl font-bold text-ink dark:text-cream">{{ rebarCalc.totalBars.value }}</span>
              </div>
              <div>
                <span class="block text-sm text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.entries') }}</span>
                <span class="sw-stat font-mono sw-tabular text-xl font-bold text-ink dark:text-cream">{{ rebarCalc.entries.value.length }}</span>
              </div>
            </div>
            <div class="text-right">
              <span class="block text-sm text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.estimatedTotalWeight') }}</span>
              <span class="sw-stat font-mono sw-tabular text-2xl font-bold text-ink dark:text-cream">{{ formatNumber(rebarCalc.totalWeight.value) }} kg</span>
              <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400 mt-1">({{ formatNumber(rebarCalc.totalWeight.value / 1000) }} {{ t('tools.rebarEstimator.tonnes') }})</span>
            </div>
          </div>
        </div>

        <!-- Formula Info -->
        <div class="mt-4 p-3 bg-stone-50 dark:bg-ink-2 rounded-lg">
          <div class="flex items-start">
            <Info class="h-4 w-4 text-stone-500 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-xs text-stone-500 dark:text-stone-400">{{ t('tools.rebarEstimator.formulaInfo') }}</p>
          </div>
        </div>
      </div>

      <!-- Concrete Calculator -->
      <div v-show="activeTool === 'concrete'" class="card">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg mr-3">
              <Box class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h2 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('tools.concreteCalculator.title') }}</h2>
              <p class="text-sm text-stone-500 dark:text-stone-400">{{ t('tools.concreteCalculator.description') }}</p>
            </div>
          </div>
          <button @click="concreteCalc.reset()" class="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
            {{ t('common.reset') }}
          </button>
        </div>

        <!-- Input Fields -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.concreteCalculator.length') }}</label>
            <div class="relative">
              <input v-model.number="concreteCalc.length.value" type="number" step="0.1" min="0.1" class="input w-full pr-8" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.concreteCalculator.width') }}</label>
            <div class="relative">
              <input v-model.number="concreteCalc.width.value" type="number" step="0.1" min="0.1" class="input w-full pr-8" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.concreteCalculator.depth') }}</label>
            <div class="relative">
              <input v-model.number="concreteCalc.depth.value" type="number" step="0.01" min="0.01" class="input w-full pr-8" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.concreteCalculator.grade') }}</label>
            <select v-model="concreteCalc.grade.value" class="input w-full">
              <option v-for="g in concreteCalc.grades" :key="g.value" :value="g.value">{{ g.label }} - {{ g.description }}</option>
            </select>
          </div>
        </div>

        <!-- Results -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.volume') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(concreteCalc.result.value.wetVolume) }} m³</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.cement') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-amber-700 dark:text-amber-400">{{ concreteCalc.result.value.cementBags }} {{ t('tools.concreteCalculator.bags') }}</span>
            <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">({{ formatNumber(concreteCalc.result.value.cementKg) }} kg)</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.sand') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(concreteCalc.result.value.sandM3) }} m³</span>
            <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">({{ formatNumber(concreteCalc.result.value.sandKg) }} kg)</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.aggregate') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(concreteCalc.result.value.aggregateM3) }} m³</span>
            <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">({{ formatNumber(concreteCalc.result.value.aggregateKg) }} kg)</span>
          </div>
        </div>

        <!-- Mix Ratio Info -->
        <div class="mt-4 p-3 bg-stone-50 dark:bg-ink-2 rounded-lg">
          <div class="flex items-start">
            <Info class="h-4 w-4 text-stone-500 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-xs text-stone-500 dark:text-stone-400">{{ t('tools.concreteCalculator.formulaInfo') }}</p>
          </div>
        </div>
      </div>

      <!-- Plaster Calculator -->
      <div v-show="activeTool === 'plaster'" class="card">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg mr-3">
              <PaintBucket class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h2 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('tools.plasterCalculator.title') }}</h2>
              <p class="text-sm text-stone-500 dark:text-stone-400">{{ t('tools.plasterCalculator.description') }}</p>
            </div>
          </div>
          <button @click="plasterCalc.reset()" class="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
            {{ t('common.reset') }}
          </button>
        </div>

        <!-- Plaster Type Quick Select -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="type in plasterCalc.types"
            :key="type.value"
            @click="plasterCalc.applyType(type.value)"
            :class="[
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              plasterCalc.plasterType.value === type.value
                ? 'bg-amber-500 text-ink hover:bg-amber-600'
                : 'bg-stone-100 dark:bg-ink-2 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-ink-3'
            ]"
          >
            {{ type.label }}
          </button>
        </div>

        <!-- Input Fields -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.plasterCalculator.area') }}</label>
            <div class="relative">
              <input v-model.number="plasterCalc.area.value" type="number" step="0.1" min="0.1" class="input w-full pr-10" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m²</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.plasterCalculator.thickness') }}</label>
            <div class="relative">
              <input v-model.number="plasterCalc.thickness.value" type="number" step="1" min="1" max="50" class="input w-full pr-12" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">mm</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.plasterCalculator.ratio') }}</label>
            <select v-model="plasterCalc.ratio.value" class="input w-full">
              <option v-for="r in plasterCalc.ratios" :key="r.value" :value="r.value">{{ r.label }} - {{ r.description }}</option>
            </select>
          </div>
        </div>

        <!-- Results -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.plasterCalculator.mortarVolume') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(plasterCalc.result.value.dryVolume, 3) }} m³</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.cement') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-amber-700 dark:text-amber-400">{{ plasterCalc.result.value.cementBags }} {{ t('tools.concreteCalculator.bags') }}</span>
            <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">({{ formatNumber(plasterCalc.result.value.cementKg) }} kg)</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.sand') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(plasterCalc.result.value.sandM3) }} m³</span>
            <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">({{ formatNumber(plasterCalc.result.value.sandKg) }} kg)</span>
          </div>
        </div>

        <!-- Per Sqm Reference -->
        <div class="mt-4 p-3 bg-stone-50 dark:bg-ink-2 rounded-lg">
          <div class="flex items-start">
            <Info class="h-4 w-4 text-stone-500 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-xs text-stone-500 dark:text-stone-400">
              {{ t('tools.plasterCalculator.perSqmInfo', { cement: formatNumber(plasterCalc.perSqm.value.cementKg), sand: formatNumber(plasterCalc.perSqm.value.sandKg) }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Brick Calculator -->
      <div v-show="activeTool === 'brick'" class="card">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-lg mr-3">
              <Layers class="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h2 class="font-display text-lg font-semibold text-ink dark:text-cream">{{ t('tools.brickCalculator.title') }}</h2>
              <p class="text-sm text-stone-500 dark:text-stone-400">{{ t('tools.brickCalculator.description') }}</p>
            </div>
          </div>
          <button @click="brickCalc.reset()" class="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
            {{ t('common.reset') }}
          </button>
        </div>

        <!-- Input Fields -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.brickCalculator.wallLength') }}</label>
            <div class="relative">
              <input v-model.number="brickCalc.length.value" type="number" step="0.1" min="0.1" class="input w-full pr-8" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.brickCalculator.wallHeight') }}</label>
            <div class="relative">
              <input v-model.number="brickCalc.height.value" type="number" step="0.1" min="0.1" class="input w-full pr-8" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.brickCalculator.openings') }}</label>
            <div class="relative">
              <input v-model.number="brickCalc.openingsArea.value" type="number" step="0.1" min="0" class="input w-full pr-10" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">m²</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.brickCalculator.brickType') }}</label>
            <select v-model="brickCalc.brickType.value" class="input w-full">
              <option v-for="b in brickCalc.brickTypes" :key="b.value" :value="b.value">{{ b.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.brickCalculator.wallThickness') }}</label>
            <select v-model="brickCalc.wallThickness.value" class="input w-full">
              <option v-for="w in brickCalc.wallThicknesses" :key="w.value" :value="w.value">{{ w.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{{ t('tools.brickCalculator.wastage') }}</label>
            <div class="relative">
              <input v-model.number="brickCalc.wastagePercent.value" type="number" step="1" min="0" max="20" class="input w-full pr-8" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400">%</span>
            </div>
          </div>
        </div>

        <!-- Results -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.brickCalculator.wallArea') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(brickCalc.result.value.netWallArea) }} m²</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.brickCalculator.bricksRequired') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-amber-700 dark:text-amber-400">{{ brickCalc.result.value.bricksWithWastage }}</span>
            <span class="block text-xs font-mono sw-tabular text-stone-500 dark:text-stone-400">({{ brickCalc.result.value.bricksRequired }} + {{ t('tools.brickCalculator.wastage') }})</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.cement') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ brickCalc.result.value.cementBags }} {{ t('tools.concreteCalculator.bags') }}</span>
          </div>
          <div class="text-center p-3 bg-white dark:bg-ink-3 rounded-lg">
            <span class="block text-xs text-stone-500 dark:text-stone-400 mb-1">{{ t('tools.concreteCalculator.sand') }}</span>
            <span class="sw-stat font-mono sw-tabular text-lg font-bold text-ink dark:text-cream">{{ formatNumber(brickCalc.result.value.sandM3) }} m³</span>
          </div>
        </div>

        <!-- Bricks per sqm reference -->
        <div class="mt-4 p-3 bg-stone-50 dark:bg-ink-2 rounded-lg">
          <div class="flex items-start">
            <Info class="h-4 w-4 text-stone-500 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-xs text-stone-500 dark:text-stone-400">
              {{ t('tools.brickCalculator.perSqmInfo', { bricks: brickCalc.result.value.bricksPerSqm }) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue';
import { Calculator, Plus, X, Info, Box, PaintBucket, Layers } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useRebarCalculator } from '../composables/useRebarCalculator';
import { useConcreteCalculator } from '../composables/useConcreteCalculator';
import { usePlasterCalculator } from '../composables/usePlasterCalculator';
import { useBrickCalculator } from '../composables/useBrickCalculator';

const { t } = useI18n();

// Active tool tab
const activeTool = ref('rebar');

// Tool definitions
const tools = [
  { id: 'rebar', labelKey: 'tools.rebarEstimator.title', icon: markRaw(Calculator) },
  { id: 'concrete', labelKey: 'tools.concreteCalculator.title', icon: markRaw(Box) },
  { id: 'plaster', labelKey: 'tools.plasterCalculator.title', icon: markRaw(PaintBucket) },
  { id: 'brick', labelKey: 'tools.brickCalculator.title', icon: markRaw(Layers) },
];

// Initialize calculators
const rebarCalc = useRebarCalculator();
const concreteCalc = useConcreteCalculator();
const plasterCalc = usePlasterCalculator();
const brickCalc = useBrickCalculator();

// Format number to specified decimal places
function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
</script>
