# 세션 4 썸네일 다시 만들기: 저장소 폴더에서 python3 -m http.server 8766 실행 후 python3 tools/s4_thumbs.py [장번호 ...] (예: K02 K04, 없으면 전체)
import asyncio,io,sys
from PIL import Image
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':4200,'height':1600},device_scale_factor=.2);pg=await ctx.new_page()
        await pg.goto('http://localhost:8766/session4.html');await pg.wait_for_timeout(1500)
        ids=await pg.evaluate("[...document.querySelectorAll('section.s')].map(x=>x.id)")
        only=sys.argv[1:]
        for i,id in enumerate(ids):
            if only and id not in only:continue
            await pg.evaluate(f"S4.go({i})");await pg.wait_for_timeout(300)
            if id=='K01':
                await pg.wait_for_timeout(1900);await pg.evaluate("document.body.classList.add('idle')")
                Image.open(io.BytesIO(await pg.screenshot())).convert('RGB').resize((840,320),Image.LANCZOS).save(f'assets/s4/thumbs/{id}.webp',quality=78);print(id);continue
            for _ in range(6):
                cur=await pg.evaluate("S4.i")
                if cur!=i:break
                await pg.keyboard.press('ArrowRight');await pg.wait_for_timeout(250)
            if await pg.evaluate("S4.i")!=i: await pg.keyboard.press('ArrowLeft');await pg.wait_for_timeout(200)
            await pg.wait_for_timeout(4200)
            await pg.evaluate("document.body.classList.add('idle')")
            png=await pg.screenshot()
            Image.open(io.BytesIO(png)).convert('RGB').resize((840,320),Image.LANCZOS).save(f'assets/s4/thumbs/{id}.webp',quality=78)
            print(id,flush=True)
        await b.close()
asyncio.run(main())
